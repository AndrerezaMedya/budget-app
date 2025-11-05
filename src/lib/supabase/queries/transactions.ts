import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type AccountRow = Pick<
  Database["public"]["Tables"]["accounts"]["Row"],
  "id" | "name"
>;
type CategoryRow = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "id" | "name"
>;

type TransactionQueryRow = TransactionRow & {
  account: AccountRow | null;
  category: CategoryRow | null;
};

export type HydratedTransaction = {
  id: string;
  description: string | null;
  occurredAt: string;
  amountMinor: number;
  currency: string;
  type: TransactionRow["type"];
  account: AccountRow | null;
  category: CategoryRow | null;
  transferDirection: TransactionRow["transfer_direction"];
  createdAt: string;
};

export async function fetchRecentTransactions(
  limit = 20,
): Promise<HydratedTransaction[]> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, description, occurred_at, amount_minor, currency, type, transfer_direction, created_at,
        account:accounts!transactions_account_id_fkey ( id, name ),
        category:categories!transactions_category_id_fkey ( id, name )`
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  const rows = (data ?? []) as TransactionQueryRow[];

  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    occurredAt: row.occurred_at,
    amountMinor: row.amount_minor,
    currency: row.currency,
    type: row.type,
    account: row.account,
    category: row.category,
    transferDirection: row.transfer_direction,
    createdAt: row.created_at,
  }));
}
