import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchBudgetsWithSummary } from "@/lib/supabase/queries/budgets";
import { fetchRecentTransactions } from "@/lib/supabase/queries/transactions";

function currentPeriodKey(date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export type OverviewSnapshot = {
  period: string;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netCashflowMinor: number;
  averageExpensePerDayMinor: number;
  activeAccounts: number;
  activeBudgets: number;
  nearingLimitBudgets: number;
  recentTransactions: number;
};

export async function fetchOverviewSnapshot(): Promise<OverviewSnapshot> {
  const period = currentPeriodKey();
  const [accountsResult, budgets] = await Promise.all([
    fetchAccounts(),
    fetchBudgetsWithSummary(period),
  ]);

  const activeAccounts = accountsResult.accounts.filter(
    (account) => !account.archived_at,
  );

  const totalIncomeMinor = budgets.reduce(
    (sum, budget) => sum + budget.incomeMinor,
    0,
  );
  const totalExpenseMinor = budgets.reduce(
    (sum, budget) => sum + budget.spentMinor,
    0,
  );
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
    averageExpensePerDayMinor,
    activeAccounts: activeAccounts.length,
    activeBudgets: budgets.length,
    nearingLimitBudgets,
    recentTransactions,
  } satisfies OverviewSnapshot;
}
