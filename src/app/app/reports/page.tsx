import { formatCurrency } from "@/lib/format";
import { fetchCategorySummaries } from "@/lib/supabase/queries/summaries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ReportsPage() {
  const summaries = await fetchCategorySummaries();
  const hasSummaries = summaries.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Derived straight from Supabase category monthly summaries.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
            <CardDescription>
              Expenses ordered by spend for the current period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasSummaries ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-right">Income</th>
                      <th className="px-4 py-3 text-right">Expense</th>
                      <th className="px-4 py-3 text-right">Remaining</th>
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
                No category summaries found for this period. Create transactions or
                seed data to populate reports.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
