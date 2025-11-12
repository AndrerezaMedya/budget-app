import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type ReceiptRow = Database["public"]["Tables"]["receipts"]["Row"];
type ReceiptJobRow = Database["public"]["Tables"]["receipt_ingestion_jobs"]["Row"];
type ReceiptLineItemRow = Database["public"]["Tables"]["receipt_line_items"]["Row"];

type ReceiptQueryRow = ReceiptRow & {
  job: ReceiptJobRow | null;
};

type ReceiptDetailQueryRow = ReceiptRow & {
  job: ReceiptJobRow | null;
  line_items: ReceiptLineItemRow[];
};

function extractWarnings(modelResponse: unknown): string[] {
  if (!modelResponse || typeof modelResponse !== "object") {
    return [];
  }

  const value = (modelResponse as { warnings?: unknown }).warnings;
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export type HydratedReceipt = {
  id: string;
  merchantName: string;
  merchantAddress: string | null;
  currency: string;
  totalMinor: number;
  subtotalMinor: number | null;
  taxMinor: number | null;
  discountMinor: number | null;
  purchaseAt: string | null;
  confidence: number | null;
  jobStatus: ReceiptJobRow["status"] | null;
  jobAttemptCount: number;
  jobUpdatedAt: string | null;
  warnings: string[];
  createdAt: string;
};

export type ReceiptDetail = HydratedReceipt & {
  subtotalMinor: number | null;
  taxMinor: number | null;
  discountMinor: number | null;
  paymentMethod: string | null;
  notes: string | null;
  storagePath: string;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPriceMinor: number | null;
    lineTotalMinor: number;
    category: string | null;
  }>;
};

export async function fetchRecentReceipts(limit = 10): Promise<HydratedReceipt[]> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("receipts")
    .select(
      `id, merchant_name, merchant_address, currency, subtotal_minor, tax_minor, discount_minor, total_minor, purchase_at, confidence, model_response, created_at,
        job:receipt_ingestion_jobs!receipts_job_id_fkey ( id, status, attempt_count, updated_at )`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    const missingTableMessage = "Could not find the table 'public.receipts'";
    if (error.message.includes(missingTableMessage)) {
      return [];
    }
    throw new Error(`Failed to load receipts: ${error.message}`);
  }

  const rows = (data ?? []) as ReceiptQueryRow[];

  return rows.map((row) => {
    const confidenceValue =
      typeof row.confidence === "number"
        ? row.confidence
        : row.confidence
          ? Number(row.confidence)
          : null;

    return {
      id: row.id,
      merchantName: row.merchant_name,
      merchantAddress: row.merchant_address,
      currency: row.currency,
      subtotalMinor: row.subtotal_minor ?? null,
      taxMinor: row.tax_minor ?? null,
      discountMinor: row.discount_minor ?? null,
      totalMinor: row.total_minor,
      purchaseAt: row.purchase_at,
      confidence: Number.isFinite(confidenceValue) ? Number(confidenceValue) : null,
      jobStatus: row.job?.status ?? null,
      jobAttemptCount: row.job?.attempt_count ?? 0,
      jobUpdatedAt: row.job?.updated_at ?? null,
      warnings: extractWarnings(row.model_response),
      createdAt: row.created_at,
    } satisfies HydratedReceipt;
  });
}

export async function fetchReceiptById(receiptId: string): Promise<ReceiptDetail | null> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("receipts")
    .select(
      `id, merchant_name, merchant_address, currency, subtotal_minor, tax_minor, discount_minor, total_minor, purchase_at, payment_method, notes, model_response, storage_path, confidence, created_at,
        job:receipt_ingestion_jobs!receipts_job_id_fkey ( id, status, attempt_count, updated_at ),
        line_items:receipt_line_items ( id, description, category, quantity, unit_price_minor, line_total_minor )`
    )
    .eq("id", receiptId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to load receipt detail: ${error.message}`);
  }

  const row = data as ReceiptDetailQueryRow;
  const confidenceValue =
    typeof row.confidence === "number"
      ? row.confidence
      : row.confidence
        ? Number(row.confidence)
        : null;

  return {
    id: row.id,
    merchantName: row.merchant_name,
    merchantAddress: row.merchant_address,
    currency: row.currency,
    subtotalMinor: row.subtotal_minor ?? null,
    taxMinor: row.tax_minor ?? null,
    discountMinor: row.discount_minor ?? null,
    totalMinor: row.total_minor,
    purchaseAt: row.purchase_at,
    paymentMethod: row.payment_method ?? null,
    notes: row.notes ?? null,
    confidence: Number.isFinite(confidenceValue) ? Number(confidenceValue) : null,
    jobStatus: row.job?.status ?? null,
    jobAttemptCount: row.job?.attempt_count ?? 0,
    jobUpdatedAt: row.job?.updated_at ?? null,
    warnings: extractWarnings(row.model_response),
    createdAt: row.created_at,
    storagePath: row.storage_path,
    lineItems: (row.line_items ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: typeof item.quantity === "string" ? item.quantity : String(item.quantity ?? "1"),
      unitPriceMinor: item.unit_price_minor ?? null,
      lineTotalMinor: item.line_total_minor ?? 0,
      category: item.category ?? null,
    })),
  } satisfies ReceiptDetail;
}
