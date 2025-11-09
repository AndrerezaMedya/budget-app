import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { DEFAULT_CURRENCY, getCurrencyDecimals } from "@/config/currencies";
import { resolvePredefinedCategoryId } from "@/lib/categories/predefined";
import { preprocessReceiptImage } from "@/lib/receipts/preprocess";
import { generatePerceptualHash } from "@/lib/receipts/dedupe";
import { performReceiptOcr } from "@/lib/receipts/ocr";
import { requestReceiptParsing } from "@/lib/receipts/parse";
import { storeReceiptImage } from "@/lib/receipts/storage";
import { createReceiptJob, updateReceiptJob } from "@/lib/receipts/jobs";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { ReceiptPayload } from "@/schemas/receipt";
import type { Json } from "@/types/supabase";
import { ZodError, type ZodIssue } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

type ProgressStage =
  | "uploading"
  | "enhancing"
  | "ocr"
  | "interpreting"
  | "validating"
  | "persisting"
  | "done"
  | "failed";

type ProcessingMode = "enhanced" | "direct";

type BasicImageMetadata = {
  width: number | null;
  height: number | null;
  format: string | null;
  size: number;
};

const PROGRESS_DESCRIPTORS: Record<Exclude<ProgressStage, "failed">, {
  label: string;
  description: string;
  range: [number, number];
}> = {
  uploading: {
    label: "Mengunggah struk",
    description: "Mengunggah struk ke server dengan koneksi aman.",
    range: [0, 10],
  },
  enhancing: {
    label: "Menjernihkan gambar",
    description: "Membersihkan citra agar teks lebih mudah dibaca.",
    range: [10, 25],
  },
  ocr: {
    label: "Membaca teks (OCR)",
    description: "Menjalankan mesin OCR untuk mengambil detail struk.",
    range: [25, 55],
  },
  interpreting: {
    label: "Menganalisis isi struk",
    description: "Menafsirkan item, harga, dan total belanja.",
    range: [55, 75],
  },
  validating: {
    label: "Memeriksa hasil",
    description: "Memastikan angka dan format transaksi konsisten.",
    range: [75, 85],
  },
  persisting: {
    label: "Menyimpan ke akun",
    description: "Menyimpan struk dan transaksi ke akun kamu.",
    range: [85, 95],
  },
  done: {
    label: "Berhasil disimpan",
    description: "Struk selesai diproses dan siap ditinjau.",
    range: [95, 100],
  },
};

const ERROR_COPY_BY_STAGE: Record<Exclude<ProgressStage, "done">, string> = {
  uploading: "Unggahan gagal. Periksa koneksi dan coba lagi.",
  enhancing: "Gambar sulit diproses. Pastikan struk tidak buram.",
  ocr: "Teks sulit terbaca. Coba foto lebih dekat atau rata.",
  interpreting: "Data belanja sulit disusun. Coba unggah ulang struk.",
  validating: "Total tidak konsisten. Periksa kembali total di struk.",
  persisting: "Tidak bisa menyimpan ke akun. Coba lagi sebentar.",
  failed: "Terjadi kesalahan saat memproses struk.",
};

async function rotateAndDescribeOriginal(buffer: Buffer, mimeType: string | null): Promise<{
  normalized: Buffer;
  metadata: BasicImageMetadata;
}> {
  try {
    const rotated = await sharp(buffer, { failOn: "none" }).rotate().toBuffer();
    const info = await sharp(rotated, { failOn: "none" }).metadata();
    return {
      normalized: rotated,
      metadata: {
        width: info.width ?? null,
        height: info.height ?? null,
        format: info.format ?? (mimeType ? mimeType.split("/")[1] ?? null : null),
        size: rotated.byteLength,
      },
    };
  } catch {
    return {
      normalized: buffer,
      metadata: {
        width: null,
        height: null,
        format: mimeType ? mimeType.split("/")[1] ?? null : null,
        size: buffer.byteLength,
      },
    };
  }
}

function clampProgress(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  const rounded = Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  return Math.min(100, Math.max(0, rounded));
}

function resolvedProgressValue(stage: ProgressStage, fraction?: number): number {
  const descriptor = PROGRESS_DESCRIPTORS[stage as Exclude<ProgressStage, "failed">];
  if (!descriptor) {
    return clampProgress(typeof fraction === "number" ? fraction * 100 : 0);
  }
  const [minimum, maximum] = descriptor.range;
  if (typeof fraction !== "number") {
    return clampProgress(maximum);
  }
  const safeFraction = Math.max(0, Math.min(1, fraction));
  const scaled = minimum + (maximum - minimum) * safeFraction;
  return clampProgress(scaled);
}

function formatOcrMessage(status: string, progress: number): string {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const normalized = status.toLowerCase();

  if (normalized.includes("recognizing") || normalized.includes("detect")) {
    return `Mengenali teks... (${percent}%)`;
  }
  if (normalized.includes("load")) {
    return "Menyiapkan mesin pembaca...";
  }
  if (normalized.includes("init")) {
    return "Menyalakan pembaca teks...";
  }
  return PROGRESS_DESCRIPTORS.ocr.description;
}

function detectExtension(contentType: string | null, fallbackName: string | undefined): string {
  if (fallbackName && fallbackName.includes(".")) {
    return fallbackName.split(".").pop() ?? "jpg";
  }

  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "image/tiff":
      return "tiff";
    default:
      return "jpg";
  }
}

function formatQuantityDisplay(rawQuantity: string): string {
  const trimmed = rawQuantity.trim();
  if (!trimmed) {
    return "1";
  }

  const numeric = Number.parseFloat(trimmed);
  if (Number.isFinite(numeric)) {
    return Number.isInteger(numeric) ? numeric.toString() : numeric.toString();
  }

  return trimmed;
}

function toMinorUnits(value: number | null | undefined, currency: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  return Math.round(value * factor);
}

async function assertNotDuplicate(userId: string, hash: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const [{ data: existingReceipt }, { data: pendingJob }] = await Promise.all([
    supabase
      .from("receipts")
      .select("id")
      .eq("user_id", userId)
      .eq("image_hash", hash)
      .maybeSingle(),
    supabase
      .from("receipt_ingestion_jobs")
      .select("id, status")
      .eq("user_id", userId)
      .eq("image_hash", hash)
      .in("status", ["pending", "processing", "succeeded"])
      .maybeSingle(),
  ]);

  if (existingReceipt) {
    throw Object.assign(new Error("Duplicate receipt detected"), { status: 409 });
  }

  if (pendingJob) {
    throw Object.assign(new Error("Receipt already being processed"), { status: 409 });
  }
}

function normalizeReceiptForPersistence(receipt: ReceiptPayload, options: { currencyOverride?: string }) {
  const currency = options.currencyOverride ?? receipt.currency ?? DEFAULT_CURRENCY;
  const purchaseAt = receipt.purchaseDate ? new Date(receipt.purchaseDate) : null;
  const purchaseAtIso = purchaseAt && Number.isFinite(purchaseAt.getTime()) ? purchaseAt.toISOString() : null;

  const subtotalMinor = toMinorUnits(receipt.subtotal, currency);
  const taxMinor = toMinorUnits(receipt.tax ?? null, currency);
  const discountMinor = toMinorUnits(receipt.discount ?? null, currency);
  const totalMinor = toMinorUnits(receipt.total, currency);

  const lineItems = receipt.lineItems.map((item) => ({
    description: item.description,
    category: item.category ?? null,
    quantity: item.quantity.toString(),
    unitPriceMinor: toMinorUnits(item.unitPrice, currency),
    lineTotalMinor: toMinorUnits(item.lineTotal, currency) ?? 0,
  }));

  if (totalMinor === null) {
    throw new Error("Unable to resolve total amount");
  }

  return {
    currency,
    purchaseAt: purchaseAtIso,
    subtotalMinor,
    taxMinor,
    discountMinor,
    totalMinor,
    lineItems,
    confidence: receipt.confidence,
    merchant: receipt.merchant,
    paymentMethod: receipt.paymentMethod ?? null,
    notes: receipt.notes ?? null,
    warnings: receipt.warnings ?? [],
    model: receipt,
  };
}

function serializeZodIssues(issues: ZodIssue[]): Json {
  return issues.map((issue) => ({
    code: issue.code,
    path: issue.path.map((segment) => String(segment)),
    message: issue.message,
  }));
}

export async function POST(request: NextRequest) {
  const supabaseAuth = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let receiptJobId: string | null = null;
  let currentStage: ProgressStage = "uploading";

  const updateProgress = async (
    stage: ProgressStage,
    value: number,
    options: { message?: string; detail?: Json | null } = {},
  ) => {
    if (!receiptJobId) {
      return;
    }
    currentStage = stage;
    await updateReceiptJob(receiptJobId, {
      progress_stage: stage,
      progress_value: clampProgress(value),
      progress_message: options.message ?? PROGRESS_DESCRIPTORS[stage as Exclude<ProgressStage, "failed">]?.description ?? null,
      progress_detail: options.detail ?? null,
    });
  };

  try {
    const formData = await request.formData();
    const accountIdValue = formData.get("accountId");
    const accountId = typeof accountIdValue === "string" ? accountIdValue.trim() : "";

    if (!accountId) {
      return NextResponse.json({ error: "Account selection is required." }, { status: 400 });
    }

    const {
      data: accountRow,
      error: accountError,
    } = await supabaseAuth
      .from("accounts")
      .select("id, name, currency")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) {
      return NextResponse.json({ error: accountError.message }, { status: 400 });
    }

    if (!accountRow) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const accountCurrency = (accountRow.currency ?? DEFAULT_CURRENCY).toUpperCase();
    const accountName = accountRow.name ?? null;

    const formCurrency = formData.get("currency");
    const currencyOverride =
      typeof formCurrency === "string" && formCurrency.trim().length > 0
        ? formCurrency.trim().toUpperCase()
        : accountCurrency;

    const localeOverride = formData.get("locale")?.toString() ?? null;

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing receipt image." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    const { processed, original, metadata } = await preprocessReceiptImage(buffer);
    const perceptualHash = await generatePerceptualHash(processed);

    await assertNotDuplicate(user.id, perceptualHash);

    const receiptJob = await createReceiptJob({
      user_id: user.id,
      status: "processing",
      image_hash: perceptualHash,
      source_filename: file.name ?? null,
      attempt_count: 1,
      progress_stage: "uploading",
      progress_value: resolvedProgressValue("uploading"),
      progress_message: PROGRESS_DESCRIPTORS.uploading.description,
      progress_detail: null,
    });

    receiptJobId = receiptJob.id;

    let storagePath: string | null = null;

    try {
      await updateProgress("enhancing", resolvedProgressValue("enhancing"), {
        message: PROGRESS_DESCRIPTORS.enhancing.description,
      });

      const extension = detectExtension(file.type ?? null, file.name);
      const upload = await storeReceiptImage({
        userId: user.id,
        buffer: original,
        contentType: file.type || "image/jpeg",
        extension,
      });
      storagePath = upload.path;

      await updateReceiptJob(receiptJob.id, { storage_path: storagePath });

      currentStage = "ocr";
      await updateProgress("ocr", resolvedProgressValue("ocr", 0), {
        message: PROGRESS_DESCRIPTORS.ocr.description,
        detail: { ocr: { status: "starting", progress: 0 } },
      });

      let lastOcrUpdate = 0;
      const pendingOcrUpdates: Array<Promise<void>> = [];

      const ocr = await performReceiptOcr(processed, {
        onProgress: ({ status, progress }) => {
          if (!receiptJobId) {
            return;
          }
          const now = Date.now();
          if (now - lastOcrUpdate < 350) {
            return;
          }
          lastOcrUpdate = now;
          const safeProgress = Math.max(0, Math.min(1, progress));
          const message = formatOcrMessage(status, safeProgress);
          const percent = resolvedProgressValue("ocr", safeProgress);
          pendingOcrUpdates.push(
            updateReceiptJob(receiptJobId, {
              progress_stage: "ocr",
              progress_value: percent,
              progress_message: message,
              progress_detail: { ocr: { status, progress: safeProgress } },
            })
              .then(() => undefined)
              .catch(() => undefined),
          );
        },
      });

      if (pendingOcrUpdates.length > 0) {
        await Promise.all(pendingOcrUpdates);
      }

      await updateProgress("ocr", resolvedProgressValue("ocr", 1), {
        message: "Pembacaan teks selesai",
        detail: { ocr: { status: "done", progress: 1, confidence: ocr.confidence } },
      });

      currentStage = "interpreting";
      await updateProgress("interpreting", resolvedProgressValue("interpreting"), {
        message: PROGRESS_DESCRIPTORS.interpreting.description,
      });

      const parsed = await requestReceiptParsing({
        image: {
          base64: original.toString("base64"),
          mimeType: file.type || "image/jpeg",
        },
        ocrText: ocr.text,
        currencyHint: currencyOverride,
        totalsHint: null,
        localeHint: localeOverride,
      });

      currentStage = "validating";
      await updateProgress("validating", resolvedProgressValue("validating"), {
        message: PROGRESS_DESCRIPTORS.validating.description,
      });

      const normalizedReceipt = normalizeReceiptForPersistence(parsed, {
        currencyOverride,
      });

      if (!normalizedReceipt.paymentMethod) {
        normalizedReceipt.paymentMethod = accountName;
      }

      if (normalizedReceipt.currency !== accountCurrency) {
        normalizedReceipt.warnings = [
          ...normalizedReceipt.warnings,
          `Mata uang struk (${normalizedReceipt.currency}) berbeda dengan mata uang akun (${accountCurrency}).`,
        ];
      }

      currentStage = "persisting";
      await updateProgress("persisting", resolvedProgressValue("persisting"), {
        message: PROGRESS_DESCRIPTORS.persisting.description,
      });

      const supabase = createSupabaseServiceClient();

      const { data: insertedReceipt, error: receiptError } = await supabase
        .from("receipts")
        .insert({
          user_id: user.id,
          job_id: receiptJob.id,
          storage_path: storagePath,
          image_hash: perceptualHash,
          merchant_name: normalizedReceipt.merchant.name,
          merchant_address: normalizedReceipt.merchant.address ?? null,
          purchase_at: normalizedReceipt.purchaseAt,
          currency: normalizedReceipt.currency,
          subtotal_minor: normalizedReceipt.subtotalMinor,
          tax_minor: normalizedReceipt.taxMinor,
          discount_minor: normalizedReceipt.discountMinor,
          total_minor: normalizedReceipt.totalMinor,
          payment_method: normalizedReceipt.paymentMethod,
          notes:
            normalizedReceipt.notes
            ?? (normalizedReceipt.warnings.length > 0 ? normalizedReceipt.warnings.join(" | ") : null),
          model_response: normalizedReceipt.model,
          ocr_text: ocr.text,
          confidence: normalizedReceipt.confidence.toFixed(3),
        })
        .select("id")
        .single();

      if (receiptError || !insertedReceipt) {
        throw new Error(receiptError?.message ?? "Unable to persist receipt");
      }

      if (normalizedReceipt.lineItems.length > 0) {
        const lineItemsPayload = normalizedReceipt.lineItems.map((item) => ({
          receipt_id: insertedReceipt.id,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unit_price_minor: item.unitPriceMinor,
          line_total_minor: item.lineTotalMinor,
        }));

        const { error: lineError } = await supabase.from("receipt_line_items").insert(lineItemsPayload);
        if (lineError) {
          throw new Error(lineError.message);
        }
      }

      const occurredAtIso = normalizedReceipt.purchaseAt ?? new Date().toISOString();
      let categoriesCreated = false;
      const transactionRows = [] as Array<{
        user_id: string;
        account_id: string;
        type: "expense";
        amount_minor: number;
        currency: string;
        occurred_at: string;
        booked_at: string;
        description: string;
        notes: string;
        category_id: string | null;
      }>;

      for (const item of normalizedReceipt.lineItems) {
        if (typeof item.lineTotalMinor !== "number" || item.lineTotalMinor <= 0) {
          continue;
        }

        let categoryId: string | null = null;
        if (item.category) {
          const [categorySlug, subcategorySlug] = item.category.split("/");
          try {
            const result = await resolvePredefinedCategoryId({
              supabase,
              userId: user.id,
              categoryType: "expense",
              categorySlug: categorySlug ?? null,
              subcategorySlug: subcategorySlug ?? null,
            });
            categoryId = result.categoryId;
            categoriesCreated ||= result.created;
          } catch (error) {
            console.warn("Failed to resolve category for receipt line item", {
              itemCategory: item.category,
              error,
            });
          }
        }

        const quantityLabel = formatQuantityDisplay(item.quantity);
        const description = `${quantityLabel} × ${item.description}`.trim();

        transactionRows.push({
          user_id: user.id,
          account_id: accountId,
          type: "expense",
          amount_minor: item.lineTotalMinor,
          currency: normalizedReceipt.currency,
          occurred_at: occurredAtIso,
          booked_at: occurredAtIso,
          description,
          notes: `Diimport dari struk ${normalizedReceipt.merchant.name} (${insertedReceipt.id.slice(0, 8)})`,
          category_id: categoryId,
        });
      }

      if (transactionRows.length > 0) {
        const { error: transactionError } = await supabase.from("transactions").insert(transactionRows);
        if (transactionError) {
          throw new Error(transactionError.message);
        }
      }

      await updateReceiptJob(receiptJob.id, {
        status: "succeeded",
        completed_at: new Date().toISOString(),
        storage_path: storagePath,
        progress_stage: "done",
        progress_value: resolvedProgressValue("done"),
        progress_message: PROGRESS_DESCRIPTORS.done.description,
      });

      revalidatePath("/app/transactions");
      revalidatePath("/app/overview");
      revalidatePath("/app/accounts");
      if (categoriesCreated) {
        revalidatePath("/app/settings");
      }
      revalidatePath("/app/budgets");

      return NextResponse.json(
        {
          jobId: receiptJob.id,
          receiptId: insertedReceipt.id,
          warnings: normalizedReceipt.warnings,
          metadata,
        },
        { status: 201 },
      );
    } catch (innerError) {
      const rawMessage = innerError instanceof Error ? innerError.message : "Unknown error";
      const isValidationError = innerError instanceof ZodError;
      const failureStage: ProgressStage = isValidationError ? "validating" : currentStage;
      const friendlyMessage = isValidationError
        ? "Struk belum terbaca lengkap. Pastikan semua item dan total terlihat jelas, lalu coba lagi."
        : rawMessage;
      const detail: Json | null = isValidationError
        ? { validationErrors: serializeZodIssues(innerError.issues) }
        : null;

      console.error("Receipt ingestion failed", {
        stage: failureStage,
        message: rawMessage,
        friendlyMessage,
      });

      await updateReceiptJob(receiptJob.id, {
        status: "failed",
        error_message: friendlyMessage,
        completed_at: new Date().toISOString(),
        storage_path: storagePath,
        error_code: failureStage,
        progress_stage: "failed",
        progress_value: clampProgress(100),
        progress_message: ERROR_COPY_BY_STAGE[failureStage] ?? ERROR_COPY_BY_STAGE.failed,
        progress_detail: detail,
      });

      const errorForClient = new Error(friendlyMessage);
      if (isValidationError) {
        Object.assign(errorForClient, { status: 422 });
      }
      throw errorForClient;
    }
  } catch (error) {
    const status = typeof (error as { status?: number }).status === "number" ? (error as { status?: number }).status! : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status });
  }
}
