import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type ReceiptRow = Database["public"]["Tables"]["receipts"]["Row"];
type ReceiptJobRow = Database["public"]["Tables"]["receipt_ingestion_jobs"]["Row"];

type ReceiptQueryRow = ReceiptRow & {
  job: ReceiptJobRow | null;
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
