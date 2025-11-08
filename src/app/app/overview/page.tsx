import Link from "next/link";
import { ArrowUpRight, PieChart, Wallet2 } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { getTranslator, type Translator } from "@/lib/i18n";
import { fetchOverviewSnapshot } from "@/lib/supabase/queries/overview";
import { formatPeriodLabel } from "@/lib/period";
import { MetricCard, type MetricTrend } from "@/components/dashboard";
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

function resolveTrendLabel(trend: MetricTrend, translate: Translator) {
  return translate(`overview.metrics.trend.${trend}`);
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const { locale, t } = await getTranslator();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const snapshot = await fetchOverviewSnapshot(resolvedSearchParams?.period);

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
              {t("overview.accounts.title")}
            </CardTitle>
            <CardDescription>
              {t("overview.accounts.description", {
                count: snapshot.activeAccounts,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <EmptyState
              icon={<Wallet2 className="size-10" />}
              description={t("overview.accounts.placeholder")}
              action={
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/app/accounts" className="flex items-center gap-1">
                    {t("nav.accounts.label")}
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 border border-border bg-surface shadow-elevation">
          <CardHeader className="gap-2 border-b border-border/60 pb-4">
            <CardTitle className="text-base font-semibold tracking-tight">
              {t("overview.budgets.title")}
            </CardTitle>
            <CardDescription>
              {t("overview.budgets.description", {
                count: snapshot.activeBudgets,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <EmptyState
              icon={<PieChart className="size-10" />}
              description={t("overview.budgets.placeholder")}
              action={
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/app/budgets" className="flex items-center gap-1">
                    {t("nav.budgets.label")}
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
