import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type CategoryWithParent = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  createdAt: string;
  updatedAt: string;
  icon: string | null;
  color: string | null;
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

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    parentName: row.parent_id ? nameLookup.get(row.parent_id) ?? null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    icon: row.icon,
    color: row.color,
  }));
}
