import { AlertTriangle } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { getTranslator } from "@/lib/i18n";
import { fetchBudgetsWithSummary } from "@/lib/supabase/queries/budgets";
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
import { formatPeriodLabel, getCurrentPeriodKey, getPeriodRange } from "@/lib/period";

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

function determineStatusDescriptor(
  plannedMinor: number,
  spentMinor: number,
  availableMinor: number,
) {
  if (plannedMinor === 0) {
    return { key: "budgets.card.status.none" as const, variant: "secondary" as const };
  }

  const spendRatio = spentMinor / plannedMinor;
  if (availableMinor < 0) {
    return { key: "budgets.card.status.over" as const, variant: "destructive" as const };
  }
  if (spendRatio >= 0.8) {
    return { key: "budgets.card.status.watch" as const, variant: "secondary" as const };
  }
  return { key: "budgets.card.status.ok" as const, variant: "default" as const };
}

function deriveProgressPercentage(plannedMinor: number, spentMinor: number) {
  if (plannedMinor <= 0) return 0;
  const ratio = spentMinor / plannedMinor;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

export default async function BudgetsPage({
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
    throw new Error("Unable to determine period range for budgets");
  }

  const budgets = await fetchBudgetsWithSummary(effectivePeriod);
  const totalPlanned = budgets.reduce((sum, budget) => sum + budget.plannedMinor, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentMinor, 0);
  const periodLabel = formatPeriodLabel(effectivePeriod, locale);

  const translateKey = (key: string | null, fallback: string) =>
    key ? t(key as Parameters<typeof t>[0]) : fallback;

  const formatBudgetCategory = (budget: (typeof budgets)[number]) => {
    const name = translateKey(budget.categoryNameKey, budget.categoryName);
    if (budget.parentName) {
      const parent = translateKey(budget.parentNameKey, budget.parentName);
      return `${parent} • ${name}`;
    }
    return name;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("budgets.heading")}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <p>{t("budgets.subheading")}</p>
            <Badge variant="outline" className="bg-muted/40 text-xs uppercase tracking-wide">
              {periodLabel}
            </Badge>
          </div>
        </div>
        <CreateBudgetForm defaultPeriod={effectivePeriod} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("budgets.stats.planned.title")}
            </CardTitle>
            <CardDescription>{t("budgets.stats.planned.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalPlanned)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("budgets.stats.planned.caption")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("budgets.stats.spent.title")}
            </CardTitle>
            <CardDescription>{t("budgets.stats.spent.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalSpent)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("budgets.stats.spent.caption")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {t("budgets.stats.active.title")}
              </CardTitle>
              <CardDescription>{t("budgets.stats.active.description")}</CardDescription>
            </div>
            <AlertTriangle className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{budgets.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("budgets.stats.active.caption")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {budgets.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>{t("budgets.empty.title")}</CardTitle>
              <CardDescription>{t("budgets.empty.description")}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          budgets.map((budget) => {
            const status = determineStatusDescriptor(
              budget.plannedMinor,
              budget.spentMinor,
              budget.availableMinor,
            );
            const progress = deriveProgressPercentage(
              budget.plannedMinor,
              budget.spentMinor,
            );
            const rolloverStatus = budget.rollover
              ? t("budgets.card.rollover.enabled")
              : t("budgets.card.rollover.disabled");

            return (
              <Card key={budget.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>{formatBudgetCategory(budget)}</CardTitle>
                    <CardDescription>
                      {t("budgets.card.budgeted", {
                        amount: formatCurrency(budget.plannedMinor),
                      })}
                    </CardDescription>
                  </div>
                  <Badge variant={status.variant}>{t(status.key)}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      {t("budgets.card.field.spent")}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(budget.spentMinor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      {t("budgets.card.field.remaining")}
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
                    {t("budgets.card.rollover.status", {
                      status: rolloverStatus,
                      period: budget.period,
                    })}
                  </p>
                  <div className="border-t border-border/60 pt-3">
                    <BudgetActions budget={budget} />
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
