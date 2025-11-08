import { formatCurrency } from "@/lib/format";
import { getTranslator } from "@/lib/i18n";
import { fetchCategorySummaries } from "@/lib/supabase/queries/summaries";
import { formatPeriodLabel, getCurrentPeriodKey, getPeriodRange } from "@/lib/period";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SearchParams = Record<string, string | string[] | undefined>;

function getParamValue(params: SearchParams | undefined, key: string): string | undefined {
  if (!params) {
    return undefined;
  }
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { t, locale } = await getTranslator();
  const defaultPeriodKey = getCurrentPeriodKey();
  const requestedPeriod = getParamValue(searchParams, "period") ?? defaultPeriodKey;
  let effectivePeriod = requestedPeriod;

  if (!getPeriodRange(effectivePeriod)) {
    effectivePeriod = defaultPeriodKey;
  }

  if (!getPeriodRange(effectivePeriod)) {
    throw new Error("Unable to determine period range for reports");
  }

  const summaries = await fetchCategorySummaries(effectivePeriod);
  const hasSummaries = summaries.length > 0;
  const periodLabel = formatPeriodLabel(effectivePeriod, locale);
  const totalExpenseMinor = summaries.reduce((sum, summary) => sum + Math.max(summary.expenseMinor, 0), 0);
  const topExpenseSummaries = summaries
    .filter((summary) => summary.expenseMinor > 0)
    .slice(0, 5);
  const hasExpenseBreakdown = hasSummaries && totalExpenseMinor > 0 && topExpenseSummaries.length > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("reports.heading")}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <p>{t("reports.subheading")}</p>
          <Badge variant="outline" className="bg-muted/40 text-xs uppercase tracking-wide">
            {periodLabel}
          </Badge>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("reports.category.title")}</CardTitle>
            <CardDescription>
              {t("reports.category.description", { period: periodLabel })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasExpenseBreakdown ? (
              <section className="mb-6 space-y-3" aria-label={t("reports.category.shareHeading")}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{t("reports.category.shareHeading")}</span>
                  <span>{t("reports.category.shareTotal", { amount: formatCurrency(totalExpenseMinor) })}</span>
                </div>
                <div className="space-y-2">
                  {topExpenseSummaries.map((summary) => {
                    const percentage = Math.round((summary.expenseMinor / totalExpenseMinor) * 100);
                    const barWidth = Math.min(100, Math.max(6, percentage));
                    return (
                      <div key={summary.categoryId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm text-foreground">
                          <span className="truncate" title={summary.categoryName}>
                            {summary.categoryName}
                          </span>
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary/70"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {hasSummaries ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">{t("reports.table.header.category")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.table.header.income")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.table.header.expense")}</th>
                      <th className="px-4 py-3 text-right">{t("reports.table.header.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {summaries.map((summary) => (
                      <tr key={summary.categoryId}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {summary.categoryName}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {formatCurrency(summary.incomeMinor)}
                        </td>
                        <td className="px-4 py-3 text-right text-destructive">
                          {formatCurrency(summary.expenseMinor)}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {formatCurrency(summary.availableMinor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                {t("reports.empty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
