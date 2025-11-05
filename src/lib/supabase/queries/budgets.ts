import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

const DEFAULT_LOCALE = "en-CA";

function currentPeriodKey(now = new Date()): string {
  return now.toLocaleDateString(DEFAULT_LOCALE, {
    year: "numeric",
    month: "2-digit",
  });
}

type BudgetsTable = Database["public"]["Tables"]["budgets"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type SummaryRow = Database["public"]["Tables"]["category_monthly_summaries"]["Row"];

type BudgetRecord = BudgetsTable & {
  category: Pick<CategoryRow, "id" | "name" | "icon" | "color">;
};

type BudgetSummaryRecord = Pick<
  SummaryRow,
  "category_id" | "period" | "expense_minor" | "income_minor" | "available_minor" | "budget_minor"
>;

export type BudgetWithSummary = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  period: string;
  plannedMinor: number;
  spentMinor: number;
  incomeMinor: number;
  availableMinor: number;
  rollover: boolean;
};

export async function fetchBudgetsWithSummary(
  period = currentPeriodKey(),
): Promise<BudgetWithSummary[]> {
  const supabase = await createSupabaseServerComponentClient();

  const [{ data: budgetsData, error: budgetsError }, { data: summariesData, error: summariesError }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(
          `id, category_id, amount_minor, rollover, period,
           category:categories!budgets_category_id_fkey ( id, name, icon, color )`
        )
        .eq("period", period)
        .order("created_at", { ascending: true }),
      supabase
        .from("category_monthly_summaries")
        .select(
          "category_id, period, expense_minor, income_minor, available_minor, budget_minor"
        )
        .eq("period", period),
    ]);

  if (budgetsError) {
    throw new Error(`Failed to load budgets: ${budgetsError.message}`);
  }

  if (summariesError) {
    throw new Error(`Failed to load budget summaries: ${summariesError.message}`);
  }

  const summaries = new Map<string, BudgetSummaryRecord>();
  (summariesData ?? []).forEach((record) => {
    summaries.set(record.category_id, record);
  });

  const rows = (budgetsData ?? []) as BudgetRecord[];

  return rows.map((row) => {
    const summary = summaries.get(row.category_id);

    return {
      id: row.id,
      categoryId: row.category.id,
      categoryName: row.category.name,
      categoryIcon: row.category.icon,
      categoryColor: row.category.color,
      period: row.period,
      plannedMinor: row.amount_minor,
      spentMinor: summary?.expense_minor ?? 0,
      incomeMinor: summary?.income_minor ?? 0,
      availableMinor: summary?.available_minor ?? row.amount_minor,
      rollover: row.rollover,
    } satisfies BudgetWithSummary;
  });
}
