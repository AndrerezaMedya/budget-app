import Link from "next/link";
import { cookies, headers } from "next/headers";
import { ArrowUpRight, PieChart, Wallet2 } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { getTranslator, type Translator } from "@/lib/i18n";
import {
  fetchOverviewSnapshot,
  fetchOverviewCharts as fetchOverviewChartsFallback,
  type OverviewCharts,
} from "@/lib/supabase/queries/overview";
import { formatPeriodLabel } from "@/lib/period";
import {
  CategorySpendDonut,
  MetricCard,
  SpendingTrendChart,
  type MetricTrend,
} from "@/components/dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OverviewPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

type MetricDefinition = {
  key: string;
  title: string;
  description: string;
  value: string;
  footnote: string;
  trend?: MetricTrend;
  trendLabel?: string;
  action?: {
    href: string;
    label: string;
  };
};

function formatDailySpend(amountMinor: number, translate: Translator) {
  if (amountMinor === 0) return translate("overview.metrics.spendVelocity.zero");
  return translate("overview.metrics.spendVelocity.value", {
    amount: formatCurrency(amountMinor),
  });
}


async function loadOverviewChartsFromApi(period?: string): Promise<OverviewCharts | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    process.env.VERCEL_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    null;

  if (!host) {
    return null;
  }

  const protocolHeader = headerStore.get("x-forwarded-proto");
  const protocol = protocolHeader ?? (host.includes("localhost") ? "http" : "https");
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const requestHeaders: HeadersInit = cookieHeader ? { cookie: cookieHeader } : {};

  try {
    const response = await fetch(`${protocol}://${host}/api/overview/charts${query}`, {
      headers: requestHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: OverviewCharts } | null;
    return payload?.data ?? null;
  } catch (error) {
    console.error("Failed to load overview charts via API", error);
    return null;
  }
}

function resolveTrendLabel(trend: MetricTrend, translate: Translator) {
  return translate(`overview.metrics.trend.${trend}`);
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const { locale, t } = await getTranslator();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const snapshot = await fetchOverviewSnapshot(resolvedSearchParams?.period);
  const charts =
    (await loadOverviewChartsFromApi(resolvedSearchParams?.period)) ??
    (await fetchOverviewChartsFallback(resolvedSearchParams?.period));

  const periodLabel = formatPeriodLabel(snapshot.period, locale);
  const netCashflowTrend: MetricTrend =
    snapshot.netCashflowMinor > 0
      ? "up"
      : snapshot.netCashflowMinor < 0
        ? "down"
        : "flat";
  const spendVelocityTrend: MetricTrend =
    snapshot.averageExpensePerDayMinor === 0 ? "flat" : "up";
  const budgetTrend: MetricTrend =
    snapshot.nearingLimitBudgets === 0 ? "flat" : "down";

  const metrics: MetricDefinition[] = [
    {
      key: "total-balance",
      title: t("overview.metrics.totalBalance.title"),
      description: t("overview.metrics.totalBalance.description"),
      value: formatCurrency(snapshot.totalAccountBalanceMinorIdr),
      footnote: t("overview.metrics.totalBalance.footnote", {
        count: snapshot.activeAccounts,
      }),
      action: {
        href: "/app/accounts",
        label: t("overview.metrics.totalBalance.action"),
      },
    },
    {
      key: "net-cashflow",
      title: t("overview.metrics.netCashflow.title"),
      description: t("overview.metrics.netCashflow.description", {
        period: periodLabel,
      }),
      value: formatCurrency(snapshot.netCashflowMinor),
      footnote: t("overview.metrics.netCashflow.footnote", {
        income: formatCurrency(snapshot.totalIncomeMinor),
        expense: formatCurrency(snapshot.totalExpenseMinor),
      }),
      trend: netCashflowTrend,
      trendLabel: resolveTrendLabel(netCashflowTrend, t),
      action: {
        href: "/app/transactions",
        label: t("overview.metrics.netCashflow.action"),
      },
    },
    {
      key: "spend-velocity",
      title: t("overview.metrics.spendVelocity.title"),
      description: t("overview.metrics.spendVelocity.description"),
      value: formatDailySpend(snapshot.averageExpensePerDayMinor, t),
      footnote: t("overview.metrics.spendVelocity.footnote", {
        count: snapshot.recentTransactions,
      }),
      trend: spendVelocityTrend,
      trendLabel: resolveTrendLabel(spendVelocityTrend, t),
      action: {
        href: "/app/transactions?type=expense",
        label: t("overview.metrics.spendVelocity.action"),
      },
    },
    {
      key: "budget-burn",
      title: t("overview.metrics.budgetBurn.title"),
      description: t("overview.metrics.budgetBurn.description"),
      value: `${snapshot.nearingLimitBudgets}`,
      footnote: t("overview.metrics.budgetBurn.footnote", {
        count: snapshot.activeBudgets,
      }),
      trend: budgetTrend,
      trendLabel: resolveTrendLabel(budgetTrend, t),
      action: {
        href: "/app/budgets",
        label: t("overview.metrics.budgetBurn.action"),
      },
    },
  ];

  const cashflowHasData = charts.cashflow.some(
    (point) => point.incomeMinor !== 0 || point.expenseMinor !== 0,
  );

  const expenseSummaries = charts.categorySummaries.filter(
    (summary) => summary.expenseMinor > 0,
  );

  const totalExpenseMinor = expenseSummaries.reduce(
    (accumulator, summary) => accumulator + summary.expenseMinor,
    0,
  );

  const topCategories = expenseSummaries.slice(0, 5);
  const topCategoriesTotal = topCategories.reduce(
    (accumulator, summary) => accumulator + summary.expenseMinor,
    0,
  );

  const categoryChartData = topCategories.map((summary) => ({
    name: summary.categoryName,
    amountMinor: summary.expenseMinor,
  }));

  const remainder = totalExpenseMinor - topCategoriesTotal;
  if (remainder > 0) {
    categoryChartData.push({
      name: t("overview.charts.categoryShare.legend.other"),
      amountMinor: remainder,
    });
  }

  const categoryChartHasData = categoryChartData.length > 0;
  const categoryChartTotalLabel = t("overview.charts.categoryShare.total", {
    amount: formatCurrency(totalExpenseMinor),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("overview.heading")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("overview.subheading")}
        </p>
        <p className="text-xs font-medium text-muted-foreground/80">
          {t("overview.periodSwitcher.label")}
          <span className="ml-1 text-muted-foreground">{periodLabel}</span>
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            label={metric.title}
            description={metric.description}
            value={metric.value}
            subtext={metric.footnote}
            trend={metric.trend}
            trendLabel={metric.trendLabel}
            rightSlot={
              metric.action ? (
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link href={metric.action.href}>
                    <span className="text-xs font-medium">{metric.action.label}</span>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 border border-border bg-surface shadow-elevation">
          <CardHeader className="gap-2 border-b border-border/60 pb-4">
            <CardTitle className="text-base font-semibold tracking-tight">
              {t("overview.charts.cashflow.title")}
            </CardTitle>
            <CardDescription>
              {t("overview.charts.cashflow.description", {
                period: periodLabel,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {cashflowHasData ? (
              <div className="h-[280px]">
                <SpendingTrendChart
                  data={charts.cashflow}
                  locale={locale}
                  labels={{
                    income: t("overview.charts.cashflow.legend.income"),
                    expense: t("overview.charts.cashflow.legend.expense"),
                    net: t("overview.charts.cashflow.legend.net"),
                  }}
                />
              </div>
            ) : (
              <EmptyState
                icon={<Wallet2 className="size-10" />}
                description={t("overview.charts.cashflow.empty")}
                action={
                  <Button variant="secondary" size="sm" asChild>
                    <Link href="/app/transactions" className="flex items-center gap-1">
                      {t("nav.transactions.label")}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 border border-border bg-surface shadow-elevation">
          <CardHeader className="gap-2 border-b border-border/60 pb-4">
            <CardTitle className="text-base font-semibold tracking-tight">
              {t("overview.charts.categoryShare.title")}
            </CardTitle>
            <CardDescription>
              {t("overview.charts.categoryShare.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {categoryChartHasData ? (
              <div className="h-[280px]">
                <CategorySpendDonut
                  data={categoryChartData}
                  locale={locale}
                  totalLabel={categoryChartTotalLabel}
                />
              </div>
            ) : (
              <EmptyState
                icon={<PieChart className="size-10" />}
                description={t("overview.charts.categoryShare.empty")}
                action={
                  <Button variant="secondary" size="sm" asChild>
                    <Link href="/app/budgets" className="flex items-center gap-1">
                      {t("nav.budgets.label")}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
