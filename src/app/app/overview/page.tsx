import Link from "next/link";
import { cookies, headers } from "next/headers";
import { ArrowUpRight, PieChart, Wallet2 } from "lucide-react";

import { resolveAppOrigin } from "@/lib/app-origin";
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
  OverviewChartsWarning,
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


async function loadOverviewChartsFromApi(period?: string): Promise<OverviewCharts> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const origin = resolveAppOrigin(headerStore);
  if (!origin) {
    throw new Error(
      "Overview charts API origin could not be resolved. Provide NEXT_PUBLIC_APP_URL or ensure host headers are forwarded.",
    );
  }

  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const requestHeaders: HeadersInit = cookieHeader ? { cookie: cookieHeader } : {};

  try {
    const response = await fetch(`${origin}/api/overview/charts${query}`, {
      headers: requestHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const detail = errorBody ? `: ${errorBody}` : "";
      throw new Error(
        `Overview charts API responded with status ${response.status}${detail}`,
      );
    }

    const payload = (await response.json()) as { data?: OverviewCharts } | null;
    if (!payload?.data) {
      throw new Error("Overview charts API returned an unexpected payload shape.");
    }

    return payload.data;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Unknown error contacting overview charts API");
  }
}

function resolveTrendLabel(trend: MetricTrend, translate: Translator) {
  return translate(`overview.metrics.trend.${trend}`);
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const { locale, t } = await getTranslator();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const snapshot = await fetchOverviewSnapshot(resolvedSearchParams?.period);
  let charts: OverviewCharts;
  let chartsSource: "api" | "fallback" = "api";
  let apiErrorDetail: string | null = null;
  try {
    charts = await loadOverviewChartsFromApi(resolvedSearchParams?.period);
  } catch (error) {
    chartsSource = "fallback";
    apiErrorDetail = error instanceof Error ? error.message : null;
    console.warn(
      "Overview charts API unavailable, falling back to Supabase query",
      {
        requestedPeriod: resolvedSearchParams?.period ?? null,
        effectivePeriod: snapshot.period,
        error,
      },
    );
    charts = await fetchOverviewChartsFallback(resolvedSearchParams?.period);
  }

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

  const fallbackWarning = chartsSource === "fallback";
  const fallbackError = apiErrorDetail ?? t("overview.charts.warning.unknownError");
  const fallbackMessages = fallbackWarning
    ? {
      title: t("overview.charts.warning.title"),
      description: t("overview.charts.warning.description"),
      lastErrorLabel: t("overview.charts.warning.lastError", { error: fallbackError }),
      retryLabel: t("overview.charts.warning.retry"),
      retryingLabel: t("overview.charts.warning.retrying"),
      retryFailedTemplate: t("overview.charts.warning.retryFailed", { error: "{{error}}" }),
    }
    : null;

  const overviewSubheading = t("overview.subheading");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("overview.heading")}
        </h1>
        {overviewSubheading ? (
          <p className="text-sm text-muted-foreground">
            {overviewSubheading}
          </p>
        ) : null}
        <p className="text-xs font-medium text-muted-foreground/80">
          {t("overview.periodSwitcher.label")}
          <span className="ml-1 text-muted-foreground">{periodLabel}</span>
        </p>
      </header>

      {fallbackWarning && fallbackMessages ? (
        <OverviewChartsWarning
          period={snapshot.period}
          errorMessage={fallbackError}
          messages={fallbackMessages}
        />
      ) : null}

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
              <div className="lg:h-[280px]">
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
