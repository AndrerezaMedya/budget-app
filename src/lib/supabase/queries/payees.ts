import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type PayeeRow = Database["public"]["Tables"]["payees"]["Row"];

export type PayeeRecord = Pick<PayeeRow, "id" | "name" | "created_at">;

export async function fetchPayees(): Promise<PayeeRecord[]> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("payees")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load payees: ${error.message}`);
  }

  return data ?? [];
}
