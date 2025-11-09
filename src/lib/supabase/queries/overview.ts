import { cache } from "react";

import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchBudgetsWithSummary } from "@/lib/supabase/queries/budgets";
import {
  fetchRecentTransactions,
  fetchTransactionSummary,
} from "@/lib/supabase/queries/transactions";
import { getCurrentPeriodKey, getPeriodRange } from "@/lib/period";

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

export const fetchOverviewSnapshot = cache(async (periodOverride?: string) => {
  const defaultPeriod = getCurrentPeriodKey();
  let effectivePeriod = periodOverride ?? defaultPeriod;

  let periodRange = getPeriodRange(effectivePeriod);
  if (!periodRange) {
    effectivePeriod = defaultPeriod;
    periodRange = getPeriodRange(effectivePeriod);
  }

  if (!periodRange) {
    throw new Error("Unable to compute period range for overview snapshot");
  }

    const { periodStart, periodEnd } = periodRange;

    const [accountsResult, budgets, transactionSummary, recentTransactionList] = await Promise.all([
      fetchAccounts(),
      fetchBudgetsWithSummary(effectivePeriod),
      fetchTransactionSummary({
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
      }),
      fetchRecentTransactions({
        limit: 10,
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

  const recentTransactions = recentTransactionList.length;

    return {
      period: effectivePeriod,
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
  });
