import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getCategoryBySlug,
  getSubcategory,
  type PredefinedCategoryType,
} from "@/config/category-definitions";
import type { Database } from "@/types/supabase";

type SupabaseDbClient = SupabaseClient<Database>;

export type EnsurePredefinedCategoryParams = {
  supabase: SupabaseDbClient;
  userId: string;
  type: PredefinedCategoryType;
  categorySlug: string;
  subcategorySlug?: string | null;
  rejectIfExisting?: boolean;
};

export type EnsurePredefinedCategoryResult = {
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
}: EnsurePredefinedCategoryParams): Promise<EnsurePredefinedCategoryResult> {
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

export type ResolvePredefinedCategoryParams = {
  supabase: SupabaseDbClient;
  userId: string;
  categoryType: PredefinedCategoryType;
  categorySlug: string | null;
  subcategorySlug?: string | null;
};

export async function resolvePredefinedCategoryId({
  supabase,
  userId,
  categoryType,
  categorySlug,
  subcategorySlug,
}: ResolvePredefinedCategoryParams): Promise<{ categoryId: string | null; created: boolean }> {
  if (!categorySlug) {
    return { categoryId: null, created: false };
  }

  const trimmedCategorySlug = categorySlug.trim();
  if (!trimmedCategorySlug) {
    return { categoryId: null, created: false };
  }

  const trimmedSubcategorySlug = subcategorySlug?.trim() ?? null;

  if (trimmedSubcategorySlug && !trimmedCategorySlug) {
    throw new Error("Select a category before choosing a subcategory.");
  }

  const ensured = await ensurePredefinedCategoryExists({
    supabase,
    userId,
    type: categoryType,
    categorySlug: trimmedCategorySlug,
    subcategorySlug: trimmedSubcategorySlug,
  });

  const created = ensured.parentCreated || ensured.childCreated;

  if (trimmedSubcategorySlug) {
    if (!ensured.childId) {
      throw new Error("Unable to resolve category.");
    }
    return { categoryId: ensured.childId, created };
  }

  if (!ensured.parentId) {
    throw new Error("Unable to resolve category.");
  }

  return { categoryId: ensured.parentId, created };
}
