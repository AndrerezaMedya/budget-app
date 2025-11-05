import { AlertTriangle } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { fetchBudgetsWithSummary } from "@/lib/supabase/queries/budgets";
import { fetchCategories } from "@/lib/supabase/queries/categories";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetActions } from "@/components/forms/budget-actions";
import { CreateBudgetForm } from "@/components/forms/create-budget-form";

function determineStatusText(
  plannedMinor: number,
  spentMinor: number,
  availableMinor: number,
) {
  if (plannedMinor === 0) {
    return { label: "No limit", variant: "secondary" as const };
  }

  const spendRatio = spentMinor / plannedMinor;
  if (availableMinor < 0) {
    return { label: "Over budget", variant: "destructive" as const };
  }
  if (spendRatio >= 0.8) {
    return { label: "Watch", variant: "secondary" as const };
  }
  return { label: "On track", variant: "default" as const };
}

function deriveProgressPercentage(plannedMinor: number, spentMinor: number) {
  if (plannedMinor <= 0) return 0;
  const ratio = spentMinor / plannedMinor;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

export default async function BudgetsPage() {
  const budgets = await fetchBudgetsWithSummary();
  const categories = await fetchCategories();
  const totalPlanned = budgets.reduce((sum, budget) => sum + budget.plannedMinor, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentMinor, 0);
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Pulling monthly budgets and spend summaries directly from Supabase.
          </p>
        </div>
        <CreateBudgetForm categories={categories} defaultPeriod={defaultPeriod} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Budgeted amount</CardTitle>
            <CardDescription>Current period total plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalPlanned)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Sum of `amount_minor` across active budgets.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Spent so far</CardTitle>
            <CardDescription>Category monthly summaries</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalSpent)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Aggregated from `category_monthly_summaries`.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Active budgets</CardTitle>
              <CardDescription>Monitoring rollover + burn rate</CardDescription>
            </div>
            <AlertTriangle className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{budgets.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Add more categories once budget creation is enabled.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {budgets.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>No budgets found</CardTitle>
              <CardDescription>
                Seed data using `public.create_workspace_seed` or add budgets once
                mutations are implemented.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          budgets.map((budget) => {
            const status = determineStatusText(
              budget.plannedMinor,
              budget.spentMinor,
              budget.availableMinor,
            );
            const progress = deriveProgressPercentage(
              budget.plannedMinor,
              budget.spentMinor,
            );

            return (
              <Card key={budget.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>{budget.categoryName}</CardTitle>
                    <CardDescription>
                      Budgeted: {formatCurrency(budget.plannedMinor)}
                    </CardDescription>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      Spent
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(budget.spentMinor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      Remaining
                    </p>
                    <p>{formatCurrency(budget.availableMinor)}</p>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rollover {budget.rollover ? "enabled" : "disabled"} · Tracked for
                    {" "}
                    {budget.period}
                  </p>
                  <div className="border-t border-border/60 pt-3">
                    <BudgetActions budget={budget} categories={categories} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
