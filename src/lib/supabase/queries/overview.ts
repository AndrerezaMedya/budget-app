import { cache } from "react";

import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchBudgetsWithSummary } from "@/lib/supabase/queries/budgets";
import {
  fetchDailyCashflow,
  fetchRecentTransactions,
  fetchTransactionSummary,
  type DailyCashflowPoint,
} from "@/lib/supabase/queries/transactions";
import { fetchCategorySummaries, type CategorySummary } from "@/lib/supabase/queries/summaries";
import { getCurrentPeriodKey, getPeriodRange } from "@/lib/period";
import type { SupabaseAuthClient } from "@/lib/supabase/server";

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

export type ResolvedPeriod = {
  period: string;
  periodStart: Date;
  periodEnd: Date;
};

export function resolveOverviewPeriod(periodOverride?: string): ResolvedPeriod {
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

  return {
    period: effectivePeriod,
    periodStart: periodRange.periodStart,
    periodEnd: periodRange.periodEnd,
  } satisfies ResolvedPeriod;
}

export const fetchOverviewSnapshot = cache(async (periodOverride?: string) => {
  const { period, periodStart, periodEnd } = resolveOverviewPeriod(periodOverride);

  const [accountsResult, budgets, transactionSummary, recentTransactionList] = await Promise.all([
    fetchAccounts(),
    fetchBudgetsWithSummary(period),
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
});

export type OverviewCharts = {
  period: string;
  cashflow: DailyCashflowPoint[];
  categorySummaries: CategorySummary[];
};

type FetchOverviewChartsOptions = {
  client?: SupabaseAuthClient;
  userId?: string;
};

export async function fetchOverviewCharts(
  periodOverride?: string,
  options: FetchOverviewChartsOptions = {},
) {
  const { period } = resolveOverviewPeriod(periodOverride);
  const { client, userId } = options;
  const [cashflow, categorySummaries] = await Promise.all([
    fetchDailyCashflow(period, { client, userId }),
    fetchCategorySummaries(period, { client, userId }),
  ]);

  return {
    period,
    cashflow,
    categorySummaries,
  } satisfies OverviewCharts;
}
