import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export type ProfilePreferences = {
  id: string;
  locale: "en" | "id";
  timeZone: string;
};

export async function fetchProfilePreferences(): Promise<ProfilePreferences | null> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, locale, time_zone")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile preferences: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    locale: (data.locale as "en" | "id") ?? "en",
    timeZone: data.time_zone ?? "Asia/Jakarta",
  };
}
