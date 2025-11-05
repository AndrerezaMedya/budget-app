"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

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

  const categoryId = formData.get("categoryId") as string | null;
  const amountMinor = parseAmount(formData.get("amount"));
  const rollover = formData.get("rollover") === "on";
  const period = (formData.get("period") as string | null) ?? currentPeriodKey();

  if (!categoryId) {
    return { status: "error", message: "Select a category." };
  }

  if (amountMinor === null) {
    return { status: "error", message: "Enter a budget amount." };
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
  const categoryId = (formData.get("categoryId") as string | null)?.trim();
  const amountMinor = parseAmount(formData.get("amount"));
  const rollover = formData.get("rollover") === "on";
  const period = (formData.get("period") as string | null)?.trim() ?? currentPeriodKey();

  if (!budgetId) {
    return { status: "error", message: "Missing budget identifier." };
  }

  if (!categoryId) {
    return { status: "error", message: "Select a category." };
  }

  if (amountMinor === null) {
    return { status: "error", message: "Enter a budget amount." };
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
