"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensurePredefinedCategoryExists } from "@/lib/categories/predefined";

import type { ActionState } from "@/actions/types";

function currentPeriodKey(now = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const numeric = Number.parseFloat(value.trim());
  if (Number.isNaN(numeric)) return null;
  return Math.round(numeric * 100);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/;

function isUuid(value: string | null): value is string {
  return !!value && UUID_PATTERN.test(value);
}

function parseCategorySelection(selection: string) {
  const [categorySlug, subcategorySlug] = selection.split("::");
  const trimmedCategory = categorySlug?.trim() ?? "";
  const trimmedSubcategory = subcategorySlug?.trim() ?? "";
  return {
    categorySlug: trimmedCategory,
    subcategorySlug: trimmedSubcategory.length > 0 ? trimmedSubcategory : null,
  };
}

export async function createBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in." };
  }

  const categorySelection = (formData.get("categorySelection") as string | null)?.trim() ?? "";
  const amountMinor = parseAmount(formData.get("amount"));
  const rollover = formData.get("rollover") === "on";
  const period = (formData.get("period") as string | null) ?? currentPeriodKey();

  if (!categorySelection) {
    return { status: "error", message: "Select a category." };
  }

  if (amountMinor === null) {
    return { status: "error", message: "Enter a budget amount." };
  }

  let categoryId: string | null = null;
  let shouldRevalidateCategories = false;

  if (isUuid(categorySelection)) {
    categoryId = categorySelection;
  } else {
    const { categorySlug, subcategorySlug } = parseCategorySelection(categorySelection);

    if (!categorySlug) {
      return { status: "error", message: "Select a category." };
    }

    try {
      const ensured = await ensurePredefinedCategoryExists({
        supabase,
        userId: user.id,
        type: "expense",
        categorySlug,
        subcategorySlug,
      });

      categoryId = subcategorySlug ? ensured.childId : ensured.parentId;

      if (!categoryId) {
        return { status: "error", message: "Unable to resolve category." };
      }

      if (ensured.parentCreated || ensured.childCreated) {
        shouldRevalidateCategories = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resolve category.";
      return { status: "error", message };
    }
  }

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: categoryId,
    amount_minor: amountMinor,
    rollover,
    period,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/budgets");
  revalidatePath("/app/overview");
  revalidatePath("/app/reports");
  if (shouldRevalidateCategories) {
    revalidatePath("/app/settings");
  }

  return { status: "success", message: "Budget created." };
}

export async function updateBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in." };
  }

  const budgetId = (formData.get("budgetId") as string | null)?.trim();
  const categorySelection = (formData.get("categorySelection") as string | null)?.trim() ?? "";
  const amountMinor = parseAmount(formData.get("amount"));
  const rollover = formData.get("rollover") === "on";
  const period = (formData.get("period") as string | null)?.trim() ?? currentPeriodKey();

  if (!budgetId) {
    return { status: "error", message: "Missing budget identifier." };
  }

  if (!categorySelection) {
    return { status: "error", message: "Select a category." };
  }

  if (amountMinor === null) {
    return { status: "error", message: "Enter a budget amount." };
  }

  let categoryId: string | null = null;
  let shouldRevalidateCategories = false;

  if (isUuid(categorySelection)) {
    categoryId = categorySelection;
  } else {
    const { categorySlug, subcategorySlug } = parseCategorySelection(categorySelection);

    if (!categorySlug) {
      return { status: "error", message: "Select a category." };
    }

    try {
      const ensured = await ensurePredefinedCategoryExists({
        supabase,
        userId: user.id,
        type: "expense",
        categorySlug,
        subcategorySlug,
      });

      categoryId = subcategorySlug ? ensured.childId : ensured.parentId;

      if (!categoryId) {
        return { status: "error", message: "Unable to resolve category." };
      }

      if (ensured.parentCreated || ensured.childCreated) {
        shouldRevalidateCategories = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resolve category.";
      return { status: "error", message };
    }
  }

  const { error } = await supabase
    .from("budgets")
    .update({
      category_id: categoryId,
      amount_minor: amountMinor,
      rollover,
      period,
    })
    .eq("id", budgetId)
    .eq("user_id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/budgets");
  revalidatePath("/app/overview");
  revalidatePath("/app/reports");
  if (shouldRevalidateCategories) {
    revalidatePath("/app/settings");
  }

  return { status: "success", message: "Budget updated." };
}

export async function deleteBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in." };
  }

  const budgetId = (formData.get("budgetId") as string | null)?.trim();

  if (!budgetId) {
    return { status: "error", message: "Missing budget identifier." };
  }

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/budgets");
  revalidatePath("/app/overview");
  revalidatePath("/app/reports");

  return { status: "success", message: "Budget removed." };
}
