import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";

type ReceiptJobRow = Database["public"]["Tables"]["receipt_ingestion_jobs"]["Row"];

type InsertPayload = Database["public"]["Tables"]["receipt_ingestion_jobs"]["Insert"];

type UpdatePayload = Database["public"]["Tables"]["receipt_ingestion_jobs"]["Update"];

export async function createReceiptJob(payload: InsertPayload): Promise<ReceiptJobRow> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("receipt_ingestion_jobs")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create receipt ingestion job");
  }

  return data;
}

export async function updateReceiptJob(id: string, patch: UpdatePayload): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("receipt_ingestion_jobs")
    .update(patch)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
