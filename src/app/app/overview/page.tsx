import { TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { getTranslator, type Translator } from "@/lib/i18n";
import { fetchOverviewSnapshot } from "@/lib/supabase/queries/overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDailySpend(amountMinor: number, translate: Translator) {
  if (amountMinor === 0) return translate("overview.metrics.spendVelocity.zero");
  return translate("overview.metrics.spendVelocity.value", {
    amount: formatCurrency(amountMinor),
  });
}

export default async function OverviewPage() {
  const { t } = await getTranslator();
  const snapshot = await fetchOverviewSnapshot();

  const metrics = [
    {
      title: t("overview.metrics.totalBalance.title"),
      description: t("overview.metrics.totalBalance.description"),
      value: formatCurrency(snapshot.totalAccountBalanceMinorIdr),
      footnote: t("overview.metrics.totalBalance.footnote", {
        count: snapshot.activeAccounts,
      }),
    },
    {
      title: t("overview.metrics.netCashflow.title"),
      description: t("overview.metrics.netCashflow.description", {
        period: snapshot.period,
      }),
      value: formatCurrency(snapshot.netCashflowMinor),
      footnote: t("overview.metrics.netCashflow.footnote", {
        income: formatCurrency(snapshot.totalIncomeMinor),
        expense: formatCurrency(snapshot.totalExpenseMinor),
      }),
    },
    {
      title: t("overview.metrics.spendVelocity.title"),
      description: t("overview.metrics.spendVelocity.description"),
      value: formatDailySpend(snapshot.averageExpensePerDayMinor, t),
      footnote: t("overview.metrics.spendVelocity.footnote", {
        count: snapshot.recentTransactions,
      }),
    },
    {
      title: t("overview.metrics.budgetBurn.title"),
      description: t("overview.metrics.budgetBurn.description"),
      value: `${snapshot.nearingLimitBudgets}`,
      footnote: t("overview.metrics.budgetBurn.footnote", {
        count: snapshot.activeBudgets,
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("overview.heading")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("overview.subheading")}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <CardDescription>{metric.description}</CardDescription>
              </div>
              <TrendingUp className="size-5 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {metric.footnote}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("overview.accounts.title")}</CardTitle>
            <CardDescription>
              {t("overview.accounts.description", {
                count: snapshot.activeAccounts,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            {t("overview.accounts.placeholder")}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("overview.budgets.title")}</CardTitle>
            <CardDescription>
              {t("overview.budgets.description", {
                count: snapshot.activeBudgets,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            {t("overview.budgets.placeholder")}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
