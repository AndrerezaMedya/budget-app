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
  searchParams?: Promise<SearchParams>;
}) {
  const { t, locale } = await getTranslator();
  const defaultPeriodKey = getCurrentPeriodKey();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPeriod = getParamValue(resolvedSearchParams, "period") ?? defaultPeriodKey;
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
  const reportsSubheading = t("reports.subheading");

  return (
    <div className="flex min-h-full flex-col gap-6 pb-[var(--app-mobile-content-padding)] md:pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("reports.heading")}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {reportsSubheading ? <p>{reportsSubheading}</p> : null}
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
                <div className="hidden max-w-full overflow-x-auto md:block">
                  <table className="min-w-full table-fixed divide-y divide-border text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-[38%] px-4 py-3 text-left">{t("reports.table.header.category")}</th>
                        <th className="w-[20%] px-4 py-3 text-right">{t("reports.table.header.budget")}</th>
                        <th className="w-[20%] px-4 py-3 text-right">{t("reports.table.header.spent")}</th>
                        <th className="w-[22%] px-4 py-3 text-right">{t("reports.table.header.variance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {summaries.map((summary) => (
                        <tr key={summary.categoryId}>
                          <td className="truncate px-4 py-3 text-muted-foreground" title={summary.categoryName}>
                            {summary.categoryName}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {summary.budgetMinor ? formatCurrency(summary.budgetMinor) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-destructive">
                            {formatCurrency(summary.expenseMinor)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right ${summary.availableMinor > 0
                              ? "text-emerald-600"
                              : summary.availableMinor < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                              }`}
                          >
                            {formatCurrency(summary.availableMinor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 p-4 md:hidden">
                  {summaries.map((summary) => (
                    <div key={summary.categoryId} className="space-y-2 rounded-md border border-border/60 bg-card/95 p-4 text-sm shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{summary.categoryName}</p>
                        <Badge variant="outline" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {formatCurrency(summary.expenseMinor)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span>{t("reports.table.header.budget")}</span>
                        <span className="text-right text-foreground">
                          {summary.budgetMinor ? formatCurrency(summary.budgetMinor) : "—"}
                        </span>
                        <span>{t("reports.table.header.variance")}</span>
                        <span
                          className={`text-right font-medium ${summary.availableMinor > 0
                            ? "text-emerald-500"
                            : summary.availableMinor < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                            }`}
                        >
                          {formatCurrency(summary.availableMinor)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
