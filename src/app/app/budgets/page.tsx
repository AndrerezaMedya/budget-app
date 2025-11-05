import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BUDGETS = [
  {
    category: "Groceries",
    amount: "Rp 3.500.000",
    spent: "2.450.000",
    status: "On track",
  },
  {
    category: "Transport",
    amount: "Rp 1.200.000",
    spent: "1.020.000",
    status: "Watch",
  },
  {
    category: "Dining Out",
    amount: "Rp 1.000.000",
    spent: "890.000",
    status: "Near limit",
  },
];

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Monthly budgets backed by category_monthly summary docs.
          </p>
        </div>
        <Button>Create budget</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BUDGETS.map((budget) => (
          <Card key={budget.category}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{budget.category}</CardTitle>
                <CardDescription>Budgeted: {budget.amount}</CardDescription>
              </div>
              <Badge
                variant={
                  budget.status === "Near limit"
                    ? "destructive"
                    : budget.status === "Watch"
                      ? "secondary"
                      : "default"
                }
              >
                {budget.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Spent so far
              </div>
              <div className="mt-1 text-2xl font-semibold">
                Rp {budget.spent}
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-muted">
                <div className="h-full w-3/4 rounded-full bg-primary/80" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Rollover support and burn-rate alerts arrive in Milestone 5.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
