"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { type PredefinedCategoryType } from "@/config/category-definitions";
import { ensurePredefinedCategoryExists } from "@/lib/categories/predefined";
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

  const typeInput = (formData.get("categoryType") as string | null)?.trim();
  const categorySlug = (formData.get("categorySlug") as string | null)?.trim();
  const subcategorySlug = (formData.get("subcategorySlug") as string | null)?.trim();

  if (!typeInput || (typeInput !== "income" && typeInput !== "expense")) {
    return { status: "error", message: "Category type is required." };
  }

  if (!categorySlug) {
    return { status: "error", message: "Select a category." };
  }

  try {
    await ensurePredefinedCategoryExists({
      supabase,
      userId: user.id,
      type: typeInput as PredefinedCategoryType,
      categorySlug,
      subcategorySlug,
      rejectIfExisting: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create category.";
    return { status: "error", message };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/budgets");
  revalidatePath("/app/transactions");
  revalidatePath("/app/overview");

  const successMessage = subcategorySlug ? "Subcategory created." : "Category created.";

  return { status: "success", message: successMessage };
}
