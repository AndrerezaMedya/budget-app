import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import {
  getCategoryByName,
  getSubcategoryByName,
  type PredefinedCategoryType,
} from "@/config/category-definitions";
import type { Database } from "@/types/supabase";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type CategoryWithParent = {
  id: string;
  name: string;
  nameKey: string | null;
  parentId: string | null;
  parentName: string | null;
  parentNameKey: string | null;
  createdAt: string;
  updatedAt: string;
  icon: string | null;
  color: string | null;
  type: PredefinedCategoryType | "unknown";
};

export async function fetchCategories(): Promise<CategoryWithParent[]> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id, created_at, updated_at, icon, color")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  const rows = (data ?? []) as CategoryRow[];
  const nameLookup = new Map<string, string>();
  rows.forEach((row) => {
    nameLookup.set(row.id, row.name);
  });

  return rows.map((row) => {
    const parentName = row.parent_id ? nameLookup.get(row.parent_id) ?? null : null;
    let type: PredefinedCategoryType | "unknown" = "unknown";
    let nameKey: string | null = null;
    let parentNameKey: string | null = null;

    if (row.parent_id) {
      const lookup = getSubcategoryByName(row.name);
      const parentDefinition = lookup?.category ?? (parentName ? getCategoryByName(parentName) : undefined);
      type = parentDefinition?.type ?? "unknown";
      nameKey = lookup?.subcategory.nameKey ?? null;
      parentNameKey = parentDefinition?.nameKey ?? null;
    } else {
      const categoryDefinition = getCategoryByName(row.name);
      type = categoryDefinition?.type ?? "unknown";
      nameKey = categoryDefinition?.nameKey ?? null;
      parentNameKey = null;
    }

    return {
      id: row.id,
      name: row.name,
      nameKey,
      parentId: row.parent_id,
      parentName,
      parentNameKey,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      icon: row.icon,
      color: row.color,
      type,
    } satisfies CategoryWithParent;
  });
}
