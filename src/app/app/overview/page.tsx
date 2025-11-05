import { TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { fetchOverviewSnapshot } from "@/lib/supabase/queries/overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDailySpend(amountMinor: number) {
  if (amountMinor === 0) return "Rp 0 / day";
  return `${formatCurrency(amountMinor)} / day`;
}

export default async function OverviewPage() {
  const snapshot = await fetchOverviewSnapshot();

  const metrics = [
    {
      title: "Net cashflow",
      description: `Period ${snapshot.period}`,
      value: formatCurrency(snapshot.netCashflowMinor),
      footnote: `Income ${formatCurrency(snapshot.totalIncomeMinor)} vs expense ${formatCurrency(snapshot.totalExpenseMinor)}`,
    },
    {
      title: "Spend velocity",
      description: "Average daily expense",
      value: formatDailySpend(snapshot.averageExpensePerDayMinor),
      footnote: `${snapshot.recentTransactions} recent transactions captured`,
    },
    {
      title: "Budget burn",
      description: "Budgets nearing limit (≥80%)",
      value: `${snapshot.nearingLimitBudgets}`,
      footnote: `${snapshot.activeBudgets} active budgets this month`,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot of Supabase-backed metrics for the current budgeting period.
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
            <CardTitle>Active accounts</CardTitle>
            <CardDescription>
              Currently tracking {snapshot.activeAccounts} accounts in Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Time-series charts wire in once account_daily summaries are hydrated.
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budgets overview</CardTitle>
            <CardDescription>
              {snapshot.activeBudgets} budgets monitored this period.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            Replace with donut/chart once category summaries feed visualization.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
