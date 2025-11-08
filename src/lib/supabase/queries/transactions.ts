import { getCategoryByName, getSubcategoryByName } from "@/config/category-definitions";
import { DEFAULT_CURRENCY } from "@/config/currencies";
import { convertMinorToIdr, fetchRatesToIdr } from "@/lib/currency";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type AccountRow = Pick<
  Database["public"]["Tables"]["accounts"]["Row"],
  "id" | "name"
>;
type CategoryRow = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "id" | "name" | "parent_id"
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
  accountId: string | null;
  account: AccountRow | null;
  category: CategoryRow | null;
  categorySlug: string | null;
  subcategorySlug: string | null;
  transferDirection: TransactionRow["transfer_direction"];
  createdAt: string;
};

export type TransactionSummary = {
  perAccountDelta: Record<string, number>;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  transactionCount: number;
};

type SummaryOptions = {
  startDate?: string;
  endDate?: string;
};

function applyNetChange(row: Pick<TransactionRow, "type" | "transfer_direction" | "amount_minor">) {
  if (row.type === "income") {
    return row.amount_minor;
  }
  if (row.type === "expense") {
    return row.amount_minor * -1;
  }
  if (row.type === "transfer") {
    if (row.transfer_direction === "in") {
      return row.amount_minor;
    }
    if (row.transfer_direction === "out") {
      return row.amount_minor * -1;
    }
  }
  return 0;
}

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerComponentClient>>;

export async function fetchTransactionSummary(
  options: SummaryOptions = {},
  client?: SupabaseClient,
): Promise<TransactionSummary> {
  const supabase = client ?? (await createSupabaseServerComponentClient());
  let query = supabase
    .from("transactions")
    .select("account_id, type, transfer_direction, amount_minor, occurred_at, currency");

  if (options.startDate) {
    query = query.gte("occurred_at", options.startDate);
  }

  if (options.endDate) {
    query = query.lt("occurred_at", options.endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to summarise transactions: ${error.message}`);
  }

  const perAccountDelta = new Map<string, number>();
  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;

  const currencies = new Set<string>();
  (data ?? []).forEach((row) => {
    if (row.currency) {
      currencies.add(row.currency);
    }
  });

  const rates = await fetchRatesToIdr(Array.from(currencies));

  (data ?? []).forEach((row) => {
    const change = applyNetChange(row);
    if (change !== 0 && row.account_id) {
      perAccountDelta.set(row.account_id, (perAccountDelta.get(row.account_id) ?? 0) + change);
    }

    if (row.type === "income") {
      totalIncomeMinor += convertMinorToIdr(
        row.amount_minor,
        row.currency ?? DEFAULT_CURRENCY,
        rates,
      );
    }

    if (row.type === "expense") {
      totalExpenseMinor += convertMinorToIdr(
        row.amount_minor,
        row.currency ?? DEFAULT_CURRENCY,
        rates,
      );
    }
  });

  return {
    perAccountDelta: Object.fromEntries(perAccountDelta),
    totalIncomeMinor,
    totalExpenseMinor,
    transactionCount: data?.length ?? 0,
  } satisfies TransactionSummary;
}

type RecentTransactionOptions = {
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export async function fetchRecentTransactions(
  options: RecentTransactionOptions = {},
): Promise<HydratedTransaction[]> {
  const supabase = await createSupabaseServerComponentClient();
  const limit = options.limit ?? 20;

  let query = supabase
    .from("transactions")
    .select(
      `id, account_id, description, occurred_at, amount_minor, currency, type, transfer_direction, created_at,
        account:accounts!transactions_account_id_fkey ( id, name ),
        category:categories!transactions_category_id_fkey ( id, name, parent_id )`
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (options.startDate) {
    query = query.gte("occurred_at", options.startDate);
  }

  if (options.endDate) {
    query = query.lt("occurred_at", options.endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  const rows = (data ?? []) as TransactionQueryRow[];

  return rows.map((row) => {
    let categorySlug: string | null = null;
    let subcategorySlug: string | null = null;

    if (row.category) {
      if (row.category.parent_id) {
        const lookup = getSubcategoryByName(row.category.name);
        if (lookup) {
          categorySlug = lookup.category.slug;
          subcategorySlug = lookup.subcategory.slug;
        }
      } else {
        const definition = getCategoryByName(row.category.name);
        if (definition) {
          categorySlug = definition.slug;
        }
      }
    }

    return {
      id: row.id,
      description: row.description,
      occurredAt: row.occurred_at,
      amountMinor: row.amount_minor,
      currency: row.currency,
      type: row.type,
      accountId: row.account_id,
      account: row.account,
      category: row.category,
      categorySlug,
      subcategorySlug,
      transferDirection: row.transfer_direction,
      createdAt: row.created_at,
    } satisfies HydratedTransaction;
  });
}
