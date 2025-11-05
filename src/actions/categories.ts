"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  getCategoryBySlug,
  getSubcategory,
  type PredefinedCategoryType,
} from "@/config/category-definitions";
import type { ActionState } from "@/actions/types";
import type { Database } from "@/types/supabase";

type SupabaseDbClient = SupabaseClient<Database>;

type EnsureCategoryParams = {
  supabase: SupabaseDbClient;
  userId: string;
  type: PredefinedCategoryType;
  categorySlug: string;
  subcategorySlug?: string | null;
  rejectIfExisting?: boolean;
};

type EnsureCategoryResult = {
  parentId: string;
  childId: string | null;
  parentCreated: boolean;
  childCreated: boolean;
};

export async function ensurePredefinedCategoryExists({
  supabase,
  userId,
  type,
  categorySlug,
  subcategorySlug,
  rejectIfExisting = false,
}: EnsureCategoryParams): Promise<EnsureCategoryResult> {
  const trimmedCategorySlug = categorySlug.trim();
  const trimmedSubcategorySlug = subcategorySlug?.trim() ?? null;

  if (!trimmedCategorySlug) {
    throw new Error("Select a category.");
  }

  const categoryDefinition = getCategoryBySlug(trimmedCategorySlug);

  if (!categoryDefinition || categoryDefinition.type !== type) {
    throw new Error("Category selection is invalid.");
  }

  if (type === "income" && trimmedSubcategorySlug) {
    throw new Error("Income categories do not support subcategories.");
  }

  const subcategoryDefinition = trimmedSubcategorySlug
    ? getSubcategory(categoryDefinition.slug, trimmedSubcategorySlug)
    : null;

  if (trimmedSubcategorySlug && !subcategoryDefinition) {
    throw new Error("Subcategory selection is invalid.");
  }

  const { data: existingParentRows, error: parentQueryError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", categoryDefinition.name)
    .is("parent_id", null)
    .limit(1);

  if (parentQueryError) {
    throw new Error(parentQueryError.message);
  }

  let parentId: string | null = existingParentRows?.[0]?.id ?? null;
  let parentCreated = false;
  let childId: string | null = null;
  let childCreated = false;

  if (!subcategoryDefinition) {
    if (parentId) {
      if (rejectIfExisting) {
        throw new Error("Category already exists.");
      }
      return {
        parentId,
        childId: null,
        parentCreated,
        childCreated,
      };
    }

    const { data: insertedParent, error: insertParentError } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: categoryDefinition.name,
        parent_id: null,
        icon: categoryDefinition.icon,
        color: categoryDefinition.color,
        order_index: categoryDefinition.order,
      })
      .select("id")
      .single();

    if (insertParentError || !insertedParent) {
      throw new Error(insertParentError?.message ?? "Unable to create category.");
    }

    parentId = insertedParent.id;
    parentCreated = true;

    return {
      parentId,
      childId: null,
      parentCreated,
      childCreated,
    };
  }

  if (!parentId) {
    const { data: insertedParent, error: insertParentError } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: categoryDefinition.name,
        parent_id: null,
        icon: categoryDefinition.icon,
        color: categoryDefinition.color,
        order_index: categoryDefinition.order,
      })
      .select("id")
      .single();

    if (insertParentError || !insertedParent) {
      throw new Error(insertParentError?.message ?? "Unable to create category.");
    }

    parentId = insertedParent.id;
    parentCreated = true;
  }

  const { data: existingChildRows, error: childQueryError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", subcategoryDefinition.name)
    .eq("parent_id", parentId)
    .limit(1);

  if (childQueryError) {
    throw new Error(childQueryError.message);
  }

  childId = existingChildRows?.[0]?.id ?? null;

  if (childId) {
    if (rejectIfExisting) {
      throw new Error("Subcategory already exists.");
    }

    return {
      parentId,
      childId,
      parentCreated,
      childCreated,
    };
  }

  const subcategoryOrderOffset = categoryDefinition.subcategories?.findIndex(
    (entry) => entry.slug === subcategoryDefinition.slug,
  );

  const orderIndex =
    typeof subcategoryOrderOffset === "number" && subcategoryOrderOffset >= 0
      ? categoryDefinition.order + subcategoryOrderOffset + 1
      : categoryDefinition.order + 1;

  const { data: insertedChild, error: insertChildError } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: subcategoryDefinition.name,
      parent_id: parentId,
      icon: subcategoryDefinition.icon,
      color: categoryDefinition.color,
      order_index: orderIndex,
    })
    .select("id")
    .single();

  if (insertChildError || !insertedChild) {
    throw new Error(insertChildError?.message ?? "Unable to create category.");
  }

  childId = insertedChild.id;
  childCreated = true;

  return {
    parentId,
    childId,
    parentCreated,
    childCreated,
  };
}

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
