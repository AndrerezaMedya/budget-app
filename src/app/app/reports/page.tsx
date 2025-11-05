import { formatCurrency } from "@/lib/format";
import { getTranslator } from "@/lib/i18n";
import { fetchCategorySummaries } from "@/lib/supabase/queries/summaries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ReportsPage() {
  const { t } = await getTranslator();
  const summaries = await fetchCategorySummaries();
  const hasSummaries = summaries.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("reports.heading")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.subheading")}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("reports.category.title")}</CardTitle>
            <CardDescription>{t("reports.category.description")}</CardDescription>
          </CardHeader>
          <CardContent>
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
