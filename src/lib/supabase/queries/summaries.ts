import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

const DEFAULT_PERIOD = (() => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
})();

type SummaryRow = Database["public"]["Tables"]["category_monthly_summaries"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type CategorySummary = {
  categoryId: string;
  categoryName: string;
  period: string;
  incomeMinor: number;
  expenseMinor: number;
  availableMinor: number;
  budgetMinor: number;
};

export async function fetchCategorySummaries(
  period = DEFAULT_PERIOD,
): Promise<CategorySummary[]> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("category_monthly_summaries")
    .select(
      `category_id, period, income_minor, expense_minor, available_minor, budget_minor,
        category:categories!category_monthly_summaries_category_id_fkey ( id, name )`
    )
    .eq("period", period)
    .order("expense_minor", { ascending: false });

  if (error) {
    throw new Error(`Failed to load category summaries: ${error.message}`);
  }

  const rows = (data ?? []) as Array<
    Pick<
      SummaryRow,
      "category_id" | "period" | "income_minor" | "expense_minor" | "available_minor" | "budget_minor"
    > & {
      category: Pick<CategoryRow, "id" | "name"> | null;
    }
  >;

  return rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category?.name ?? "Unknown",
    period: row.period,
    incomeMinor: row.income_minor,
    expenseMinor: row.expense_minor,
    availableMinor: row.available_minor,
    budgetMinor: row.budget_minor,
  }));
}
