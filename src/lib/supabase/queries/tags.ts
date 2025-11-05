import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type TagRow = Database["public"]["Tables"]["tags"]["Row"];

export type TagRecord = Pick<TagRow, "id" | "name" | "color">;

export async function fetchTags(): Promise<TagRecord[]> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tags: ${error.message}`);
  }

  return data ?? [];
}
