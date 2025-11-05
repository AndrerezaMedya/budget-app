"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/actions/types";

export async function createCategoryAction(
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

  const name = (formData.get("name") as string | null)?.trim();
  const icon = (formData.get("icon") as string | null)?.trim() || null;
  const color = (formData.get("color") as string | null)?.trim() || null;

  if (!name) {
    return { status: "error", message: "Category name is required." };
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    parent_id: null,
    icon: icon || null,
    color: color || null,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/budgets");
  revalidatePath("/app/transactions");
  revalidatePath("/app/overview");

  return { status: "success", message: "Category created." };
}
