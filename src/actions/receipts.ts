"use server";

import { revalidatePath } from "next/cache";

import { resolvePredefinedCategoryId } from "@/lib/categories/predefined";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { normalizeCurrency, parseAmountToMinor } from "@/lib/currency";

import type { ActionState } from "@/actions/types";

type DraftLineItemPayload = {
  id?: string | null;
  description?: string;
  quantity?: string;
  unitPrice?: string;
  lineTotal?: string;
  category?: string | null;
};

type NormalizedLineItem = {
  description: string;
  quantity: string;
  unitPriceMinor: number | null;
  lineTotalMinor: number;
  category: string | null;
};

function combineDateTime(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date) {
    return null;
  }
  const normalizedDate = date.trim();
  if (!normalizedDate) {
    return null;
  }
  const safeTime = time?.trim();
  const isoCandidate = safeTime && safeTime.length >= 4 ? `${normalizedDate}T${safeTime}` : `${normalizedDate}T00:00`;
  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function formatQuantityLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "1";
  }
  return trimmed;
}

export async function finalizeReceiptTransactionsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in." };
  }

  const receiptId = (formData.get("receiptId") as string | null)?.trim();
  const accountId = (formData.get("accountId") as string | null)?.trim();
  const merchantName = (formData.get("merchantName") as string | null)?.trim();
  const paymentMethod = (formData.get("paymentMethod") as string | null)?.trim() ?? null;
  const notesInput = (formData.get("notes") as string | null)?.trim() ?? null;
  const currencyInput = (formData.get("currency") as string | null)?.trim();
  const subtotalInput = formData.get("subtotal");
  const taxInput = formData.get("tax");
  const discountInput = formData.get("discount");
  const totalInput = formData.get("total");
  const purchaseDateInput = (formData.get("purchaseDate") as string | null)?.trim();
  const purchaseTimeInput = (formData.get("purchaseTime") as string | null)?.trim();
  const lineItemsRaw = formData.get("lineItems");

  if (!receiptId) {
    return { status: "error", message: "Missing receipt identifier." };
  }

  if (!accountId) {
    return { status: "error", message: "Select the payment account." };
  }

  if (!merchantName) {
    return { status: "error", message: "Merchant name is required." };
  }

  let parsedLineItems: DraftLineItemPayload[] = [];

  if (typeof lineItemsRaw === "string") {
    try {
      const parsed = JSON.parse(lineItemsRaw) as DraftLineItemPayload[];
      if (Array.isArray(parsed)) {
        parsedLineItems = parsed;
      }
    } catch (error) {
      console.error("Unable to parse receipt line items payload", error);
      return { status: "error", message: "Invalid line item payload." };
    }
  }

  if (parsedLineItems.length === 0) {
    return { status: "error", message: "Add at least one receipt item." };
  }

  const normalizedCurrency = normalizeCurrency(currencyInput);
  const subtotalMinor = typeof subtotalInput === "string" && subtotalInput.trim()
    ? parseAmountToMinor(subtotalInput, normalizedCurrency, { allowZero: true })
    : null;
  const taxMinor = typeof taxInput === "string" && taxInput.trim()
    ? parseAmountToMinor(taxInput, normalizedCurrency, { allowZero: true })
    : null;
  const discountMinor = typeof discountInput === "string" && discountInput.trim()
    ? parseAmountToMinor(discountInput, normalizedCurrency, { allowZero: true })
    : null;
  const totalMinor = parseAmountToMinor(totalInput, normalizedCurrency);

  if (totalMinor === null) {
    return { status: "error", message: "Enter a valid total amount." };
  }

  const normalizedLineItems: NormalizedLineItem[] = [];

  for (const item of parsedLineItems) {
    const description = (item.description ?? "").trim();
    if (!description) {
      return { status: "error", message: "Each receipt item needs a description." };
    }

    const quantity = formatQuantityLabel(item.quantity ?? "1");
    const unitPriceMinor = item.unitPrice && item.unitPrice.trim()
      ? parseAmountToMinor(item.unitPrice, normalizedCurrency, { allowZero: true })
      : null;
    const lineTotalMinor = parseAmountToMinor(item.lineTotal ?? null, normalizedCurrency);

    if (lineTotalMinor === null) {
      return { status: "error", message: `Line item '${description}' is missing an amount.` };
    }

    normalizedLineItems.push({
      description,
      quantity,
      unitPriceMinor,
      lineTotalMinor,
      category: (item.category ?? "").trim() || null,
    });
  }

  if (normalizedLineItems.length === 0) {
    return { status: "error", message: "Add at least one receipt item." };
  }

  const sumOfLineItems = normalizedLineItems.reduce((total, item) => total + item.lineTotalMinor, 0);
  const tolerance = Math.max(5, Math.round(totalMinor * 0.02));
  if (Math.abs(sumOfLineItems - totalMinor) > tolerance) {
    return {
      status: "error",
      message: "Line item totals should be close to the receipt total.",
    };
  }

  const occurredAtIso = combineDateTime(purchaseDateInput, purchaseTimeInput);
  if (!occurredAtIso) {
    return { status: "error", message: "Provide a valid purchase date." };
  }

  const { data: existingReceipt, error: receiptError } = await supabase
    .from("receipts")
    .select("id")
    .eq("id", receiptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (receiptError) {
    return { status: "error", message: receiptError.message };
  }

  if (!existingReceipt) {
    return { status: "error", message: "Receipt not found." };
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) {
    return { status: "error", message: accountError.message };
  }

  if (!accountRow) {
    return { status: "error", message: "Account not found." };
  }

  const { error: updateReceiptError } = await supabase
    .from("receipts")
    .update({
      merchant_name: merchantName,
      payment_method: paymentMethod,
      notes: notesInput,
      currency: normalizedCurrency,
      subtotal_minor: subtotalMinor,
      tax_minor: taxMinor,
      discount_minor: discountMinor,
      total_minor: totalMinor,
      purchase_at: occurredAtIso,
    })
    .eq("id", receiptId)
    .eq("user_id", user.id);

  if (updateReceiptError) {
    return { status: "error", message: updateReceiptError.message };
  }

  const { error: deleteExistingLineItemsError } = await supabase
    .from("receipt_line_items")
    .delete()
    .eq("receipt_id", receiptId);

  if (deleteExistingLineItemsError) {
    return { status: "error", message: deleteExistingLineItemsError.message };
  }

  const lineItemsInsert = normalizedLineItems.map((item) => ({
    receipt_id: receiptId,
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unit_price_minor: item.unitPriceMinor,
    line_total_minor: item.lineTotalMinor,
  }));

  if (lineItemsInsert.length > 0) {
    const { error: insertLineItemsError } = await supabase.from("receipt_line_items").insert(lineItemsInsert);
    if (insertLineItemsError) {
      return { status: "error", message: insertLineItemsError.message };
    }
  }

  const noteToken = `receipt:${receiptId}`;
  const shortReceiptId = receiptId.slice(0, 8);

  const { error: removeExistingTransactionsError } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", user.id)
    .or(`notes.ilike.%${noteToken}%,notes.ilike.%${shortReceiptId}%`);

  if (removeExistingTransactionsError) {
    return { status: "error", message: removeExistingTransactionsError.message };
  }

  const transactionRows: Array<{
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
  }> = [];

  let shouldRevalidateCategories = false;

  for (const [index, item] of normalizedLineItems.entries()) {
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
        shouldRevalidateCategories ||= result.created;
      } catch (error) {
        console.warn("Unable to resolve category for receipt item", {
          description: item.description,
          category: item.category,
          error,
        });
        return {
          status: "error",
          message: `Kategori untuk item '${item.description}' tidak valid.`,
        };
      }
    }

    const quantityLabel = formatQuantityLabel(item.quantity);
    const description = quantityLabel === "1"
      ? item.description
      : `${quantityLabel} × ${item.description}`;

    transactionRows.push({
      user_id: user.id,
      account_id: accountId,
      type: "expense",
      amount_minor: item.lineTotalMinor,
      currency: normalizedCurrency,
      occurred_at: occurredAtIso,
      booked_at: occurredAtIso,
      description,
      notes: `Struk ${merchantName} (${noteToken}|${index + 1})`,
      category_id: categoryId,
    });
  }

  if (transactionRows.length === 0) {
    return { status: "error", message: "Tidak ada transaksi untuk disimpan." };
  }

  const { error: insertTransactionsError } = await supabase.from("transactions").insert(transactionRows);

  if (insertTransactionsError) {
    return { status: "error", message: insertTransactionsError.message };
  }

  revalidatePath("/app/transactions");
  revalidatePath("/app/overview");
  revalidatePath("/app/accounts");
  revalidatePath("/app/budgets");
  revalidatePath("/app/receipts");
  if (shouldRevalidateCategories) {
    revalidatePath("/app/settings");
  }

  return {
    status: "success",
    message: "Receipt transactions saved.",
  };
}

export async function discardReceiptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in." };
  }

  const receiptId = (formData.get("receiptId") as string | null)?.trim();

  if (!receiptId) {
    return { status: "error", message: "Missing receipt identifier." };
  }

  const { data: receiptRow, error: receiptError } = await supabase
    .from("receipts")
    .select("id, job_id")
    .eq("id", receiptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (receiptError) {
    return { status: "error", message: receiptError.message };
  }

  if (!receiptRow) {
    return { status: "error", message: "Receipt not found." };
  }

  const noteToken = `receipt:${receiptId}`;
  await supabase
    .from("transactions")
    .delete()
    .eq("user_id", user.id)
    .ilike("notes", `%${noteToken}%`);

  const { error: deleteReceiptError } = await supabase
    .from("receipts")
    .delete()
    .eq("id", receiptId)
    .eq("user_id", user.id);

  if (deleteReceiptError) {
    return { status: "error", message: deleteReceiptError.message };
  }

  if (receiptRow.job_id) {
    await supabase
      .from("receipt_ingestion_jobs")
      .delete()
      .eq("id", receiptRow.job_id)
      .eq("user_id", user.id);
  }

  revalidatePath("/app/receipts");
  revalidatePath("/app/transactions");

  return {
    status: "success",
    message: "Receipt removed. You can scan again.",
  };
}
