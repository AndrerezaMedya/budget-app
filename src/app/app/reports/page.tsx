import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Plug charts into Firestore summaries for instant analytics.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense trends</CardTitle>
            <CardDescription>
              Hook into `category_monthly` for stacked bar charts.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 rounded-lg border border-dashed border-border bg-muted/40" />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account balances</CardTitle>
            <CardDescription>
              Visualize rolling balances derived from `account_daily`.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 rounded-lg border border-dashed border-border bg-muted/40" />
        </Card>
      </div>
    </div>
  );
}
