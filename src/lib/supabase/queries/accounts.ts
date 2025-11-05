import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { fetchTransactionSummary } from "@/lib/supabase/queries/transactions";
import { convertMinorToIdr, fetchRatesToIdr } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@/config/currencies";
import type { Database } from "@/types/supabase";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

export type AccountWithBalance = AccountRow & {
  current_balance_minor: number;
};

type AccountsQueryResult = {
  accounts: AccountWithBalance[];
  totalBalanceMinorIdr: number;
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

  const accounts = (data ?? []) as AccountRow[];
  const summary = await fetchTransactionSummary({}, supabase);

  const accountsWithBalance = accounts.map((account) => {
    const delta = summary.perAccountDelta[account.id] ?? 0;
    return {
      ...account,
      current_balance_minor: account.opening_balance_minor + delta,
    } satisfies AccountWithBalance;
  });

  const activeAccountsWithBalance = accountsWithBalance.filter(
    (account) => !account.archived_at,
  );

  const currencies = new Set<string>();
  activeAccountsWithBalance.forEach((account) => {
    if (account.currency) {
      currencies.add(account.currency);
    }
  });

  const rates = await fetchRatesToIdr(Array.from(currencies));

  const totalBalanceMinorIdr = activeAccountsWithBalance.reduce((sum, account) => {
    return (
      sum + convertMinorToIdr(account.current_balance_minor, account.currency ?? DEFAULT_CURRENCY, rates)
    );
  }, 0);

  return { accounts: accountsWithBalance, totalBalanceMinorIdr };
}
