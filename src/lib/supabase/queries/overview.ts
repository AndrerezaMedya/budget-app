import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchBudgetsWithSummary } from "@/lib/supabase/queries/budgets";
import { fetchRecentTransactions, fetchTransactionSummary } from "@/lib/supabase/queries/transactions";

function currentPeriodKey(date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export type OverviewSnapshot = {
  period: string;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netCashflowMinor: number;
  totalAccountBalanceMinorIdr: number;
  averageExpensePerDayMinor: number;
  activeAccounts: number;
  activeBudgets: number;
  nearingLimitBudgets: number;
  recentTransactions: number;
};

export async function fetchOverviewSnapshot(): Promise<OverviewSnapshot> {
  const period = currentPeriodKey();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const [accountsResult, budgets, transactionSummary] = await Promise.all([
    fetchAccounts(),
    fetchBudgetsWithSummary(period),
    fetchTransactionSummary({
      startDate: periodStart.toISOString(),
      endDate: periodEnd.toISOString(),
    }),
  ]);

  const activeAccounts = accountsResult.accounts.filter(
    (account) => !account.archived_at,
  );

  const totalIncomeMinor = transactionSummary.totalIncomeMinor;
  const totalExpenseMinor = transactionSummary.totalExpenseMinor;
  const netCashflowMinor = totalIncomeMinor - totalExpenseMinor;

  const nearingLimitBudgets = budgets.filter((budget) => {
    if (budget.plannedMinor === 0) return false;
    const spentRatio = budget.spentMinor / budget.plannedMinor;
    return spentRatio >= 0.8;
  }).length;

  const now = new Date();
  const daysElapsed = now.getDate();
  const averageExpensePerDayMinor =
    daysElapsed > 0 ? Math.round(totalExpenseMinor / daysElapsed) : 0;

  const recentTransactions = (await fetchRecentTransactions(10)).length;

  return {
    period,
    totalIncomeMinor,
    totalExpenseMinor,
    netCashflowMinor,
  totalAccountBalanceMinorIdr: accountsResult.totalBalanceMinorIdr,
    averageExpensePerDayMinor,
    activeAccounts: activeAccounts.length,
    activeBudgets: budgets.length,
    nearingLimitBudgets,
    recentTransactions,
  } satisfies OverviewSnapshot;
}
