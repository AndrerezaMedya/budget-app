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
  const parentId = (formData.get("parentId") as string | null)?.trim() || null;
  const icon = (formData.get("icon") as string | null)?.trim() || null;
  const color = (formData.get("color") as string | null)?.trim() || null;

  if (!name) {
    return { status: "error", message: "Category name is required." };
  }

  if (parentId === "") {
    return { status: "error", message: "Invalid parent category." };
  }

  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", parentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (parentError) {
      return { status: "error", message: parentError.message };
    }

    if (!parent) {
      return { status: "error", message: "Parent category not found." };
    }
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    parent_id: parentId,
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
