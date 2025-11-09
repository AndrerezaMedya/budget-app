import { getCategoryByName, getSubcategoryByName } from "@/config/category-definitions";
import { requireUserId } from "@/lib/supabase/auth";
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
type BudgetRecord = BudgetsTable & {
  category: Pick<CategoryRow, "id" | "name" | "icon" | "color" | "parent_id">;
};

type ParentNameRow = Pick<CategoryRow, "id" | "name">;
type ChildLinkRow = Pick<CategoryRow, "id" | "parent_id">;

type TransactionRow = Pick<
  Database["public"]["Tables"]["transactions"]["Row"],
  "category_id" | "type" | "amount_minor" | "occurred_at"
>;

function resolvePeriodRange(period: string) {
  const [year, month] = period.split("-");
  const yearNum = Number.parseInt(year ?? "", 10);
  const monthNum = Number.parseInt(month ?? "", 10);

  if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) {
    throw new Error(`Invalid budget period: ${period}`);
  }

  const periodStart = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0, 0));

  return {
    startIso: periodStart.toISOString(),
    endIso: periodEnd.toISOString(),
  };
}

export type BudgetWithSummary = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string | null;
  subcategorySlug: string | null;
  categoryNameKey: string | null;
  parentName: string | null;
  parentNameKey: string | null;
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
  const userId = await requireUserId();
  const supabase = await createSupabaseServerComponentClient();

  const { data: budgetsData, error: budgetsError } = await supabase
    .from("budgets")
    .select(
      `id, category_id, amount_minor, rollover, period,
       category:categories!budgets_category_id_fkey (
         id, name, icon, color, parent_id
       )`
    )
    .eq("user_id", userId)
    .eq("period", period)
    .order("created_at", { ascending: true });

  if (budgetsError) {
    throw new Error(`Failed to load budgets: ${budgetsError.message}`);
  }

  const rows = (budgetsData ?? []) as BudgetRecord[];
    const parentLookup = new Map<string, string>();
    const childMap = new Map<string, string[]>();
    const parentNameIds = new Set<string>();
    const parentBudgetIds = new Set<string>();

    rows.forEach((row) => {
      if (row.category.parent_id) {
        parentNameIds.add(row.category.parent_id);
      } else {
        parentBudgetIds.add(row.category.id);
      }
    });

    if (parentNameIds.size > 0) {
      const { data: parentData, error: parentError } = await supabase
        .from("categories")
        .select("id, name")
        .in("id", Array.from(parentNameIds));

      if (parentError) {
        throw new Error(`Failed to load parent categories: ${parentError.message}`);
      }

      (parentData as ParentNameRow[] | null)?.forEach((parent) => {
        parentLookup.set(parent.id, parent.name);
      });
    }

    if (parentBudgetIds.size > 0) {
      const { data: childData, error: childError } = await supabase
        .from("categories")
        .select("id, parent_id")
        .in("parent_id", Array.from(parentBudgetIds));

      if (childError) {
        throw new Error(`Failed to load child categories: ${childError.message}`);
      }

      (childData as ChildLinkRow[] | null)?.forEach((child) => {
        if (!child.parent_id) {
          return;
        }
        const existing = childMap.get(child.parent_id);
        if (existing) {
          existing.push(child.id);
        } else {
          childMap.set(child.parent_id, [child.id]);
        }
      });
    }

    const categoryIds = new Set<string>();
    rows.forEach((row) => {
      categoryIds.add(row.category.id);
      if (!row.category.parent_id) {
        const children = childMap.get(row.category.id);
        children?.forEach((childId) => categoryIds.add(childId));
      }
    });

    const transactionSummary = new Map<string, { expense: number; income: number }>();

    if (categoryIds.size > 0) {
      const { startIso, endIso } = resolvePeriodRange(period);
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("category_id, type, amount_minor, occurred_at")
        .in("category_id", Array.from(categoryIds))
        .eq("user_id", userId)
        .gte("occurred_at", startIso)
        .lt("occurred_at", endIso);

      if (txError) {
        throw new Error(`Failed to summarise budget spending: ${txError.message}`);
      }

      (txData as TransactionRow[] | null)?.forEach((row) => {
        if (!row.category_id) {
          return;
        }
        const entry = transactionSummary.get(row.category_id) ?? { expense: 0, income: 0 };
        if (row.type === "expense") {
          entry.expense += row.amount_minor;
        } else if (row.type === "income") {
          entry.income += row.amount_minor;
        }
        transactionSummary.set(row.category_id, entry);
      });
    }

  return rows.map((row) => {
      let parentName = row.category.parent_id ? parentLookup.get(row.category.parent_id) ?? null : null;

      let categorySlug: string | null = null;
      let subcategorySlug: string | null = null;
      let categoryNameKey: string | null = null;
      let parentNameKey: string | null = null;

      if (row.category.parent_id) {
        const lookup = getSubcategoryByName(row.category.name);
        const parentDefinition = lookup?.category ?? (parentName ? getCategoryByName(parentName) : undefined);
        categorySlug = parentDefinition?.slug ?? null;
        parentName = parentDefinition?.name ?? parentName;
        parentNameKey = parentDefinition?.nameKey ?? null;
        subcategorySlug = lookup?.subcategory.slug ?? null;
        categoryNameKey = lookup?.subcategory.nameKey ?? null;
      } else {
        const categoryDefinition = getCategoryByName(row.category.name);
        categorySlug = categoryDefinition?.slug ?? null;
        categoryNameKey = categoryDefinition?.nameKey ?? null;
        parentNameKey = null;
      }

      const directSummary = transactionSummary.get(row.category.id);
      let spentMinor = directSummary?.expense ?? 0;
      let incomeMinor = directSummary?.income ?? 0;

      if (!row.category.parent_id) {
        const childIds = childMap.get(row.category.id) ?? [];
        childIds.forEach((childId) => {
          const childSummary = transactionSummary.get(childId);
          if (!childSummary) {
            return;
          }
          spentMinor += childSummary.expense;
          incomeMinor += childSummary.income;
        });
      }

      const availableMinor = row.amount_minor - spentMinor + incomeMinor;

      return {
        id: row.id,
        categoryId: row.category.id,
        categoryName: row.category.name,
        categorySlug,
        subcategorySlug,
        categoryNameKey,
        parentName,
        parentNameKey,
        categoryIcon: row.category.icon,
        categoryColor: row.category.color,
        period: row.period,
        plannedMinor: row.amount_minor,
        spentMinor,
        incomeMinor,
        availableMinor,
        rollover: row.rollover,
      } satisfies BudgetWithSummary;
    });
}
