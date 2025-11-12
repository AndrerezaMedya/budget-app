import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

const JOB_NOT_FOUND_MESSAGE = "Job not found";

function coerceWarnings(modelResponse: unknown): string[] {
  if (!modelResponse || typeof modelResponse !== "object") {
    return [];
  }

  const value = (modelResponse as { warnings?: unknown }).warnings;
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId?: string }> },
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job, error: jobError } = await supabase
    .from("receipt_ingestion_jobs")
    .select(
      "id, status, error_message, error_code, source_filename, storage_path, attempt_count, created_at, updated_at, completed_at, progress_stage, progress_message, progress_value, progress_detail",
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 400 });
  }

  if (!job) {
    return NextResponse.json({ error: JOB_NOT_FOUND_MESSAGE }, { status: 404 });
  }

  const responsePayload: {
    job: {
      id: string;
      status: typeof job.status;
      errorMessage: string | null;
      errorCode: string | null;
      sourceFilename: string | null;
      storagePath: string | null;
      attemptCount: number;
      createdAt: string;
      updatedAt: string;
      completedAt: string | null;
      progressStage: string | null;
      progressMessage: string | null;
      progressValue: number | null;
      progressDetail: unknown;
    };
    receipt?: {
      id: string;
      merchantName: string;
      merchantAddress: string | null;
      currency: string;
      subtotalMinor: number | null;
      taxMinor: number | null;
      discountMinor: number | null;
      totalMinor: number;
      paymentMethod: string | null;
      notes: string | null;
      purchaseAt: string | null;
      confidence: number | null;
      warnings: string[];
      lineItems: Array<{
        id: string;
        description: string;
        quantity: string;
        unitPriceMinor: number | null;
        lineTotalMinor: number;
        category: string | null;
      }>;
    } | null;
  } = {
    job: {
      id: job.id,
      status: job.status,
      errorMessage: job.error_message,
      errorCode: job.error_code,
      sourceFilename: job.source_filename,
      storagePath: job.storage_path,
      attemptCount: job.attempt_count ?? 0,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
      progressStage: job.progress_stage ?? null,
      progressMessage: job.progress_message ?? null,
      progressValue: typeof job.progress_value === "number" ? Number(job.progress_value) : null,
      progressDetail: job.progress_detail ?? null,
    },
  };

  if (job.status === "succeeded") {
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select(
        "id, merchant_name, merchant_address, currency, subtotal_minor, tax_minor, discount_minor, total_minor, payment_method, notes, purchase_at, confidence, model_response",
      )
      .eq("job_id", jobId)
      .maybeSingle();

    if (receiptError) {
      return NextResponse.json({ error: receiptError.message }, { status: 400 });
    }

    if (receipt) {
      const { data: lineItems, error: lineItemsError } = await supabase
        .from("receipt_line_items")
        .select("id, description, category, quantity, unit_price_minor, line_total_minor")
        .eq("receipt_id", receipt.id);

      if (lineItemsError) {
        return NextResponse.json({ error: lineItemsError.message }, { status: 400 });
      }

      const confidenceValue =
        typeof receipt.confidence === "number"
          ? receipt.confidence
          : receipt.confidence
            ? Number(receipt.confidence)
            : null;

      responsePayload.receipt = {
        id: receipt.id,
        merchantName: receipt.merchant_name,
        merchantAddress: receipt.merchant_address,
        currency: receipt.currency,
        subtotalMinor: receipt.subtotal_minor ?? null,
        taxMinor: receipt.tax_minor ?? null,
        discountMinor: receipt.discount_minor ?? null,
        totalMinor: receipt.total_minor,
        paymentMethod: receipt.payment_method,
        notes: receipt.notes,
        purchaseAt: receipt.purchase_at,
        confidence: Number.isFinite(confidenceValue) ? Number(confidenceValue) : null,
        warnings: coerceWarnings(receipt.model_response),
        lineItems: (lineItems ?? []).map((item) => ({
          id: item.id,
          description: item.description,
          quantity: typeof item.quantity === "string" ? item.quantity : String(item.quantity ?? "1"),
          unitPriceMinor: item.unit_price_minor ?? null,
          lineTotalMinor: item.line_total_minor ?? 0,
          category: item.category ?? null,
        })),
      };
    }
  }

  return NextResponse.json(responsePayload);
}
