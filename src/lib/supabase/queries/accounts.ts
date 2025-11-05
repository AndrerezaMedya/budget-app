import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

type AccountsQueryResult = {
  accounts: AccountRow[];
};

export async function fetchAccounts(): Promise<AccountsQueryResult> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, name, type, currency, opening_balance_minor, order_index, archived_at, created_at, updated_at, user_id",
    )
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load accounts: ${error.message}`);
  }

  return { accounts: data ?? [] };
}
