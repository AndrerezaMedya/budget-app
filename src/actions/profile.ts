"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/actions/types";

const SUPPORTED_LOCALES = ["en", "id"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export async function updateLanguageAction(
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

  const localeValue = (formData.get("locale") as string | null)?.trim();

  if (!localeValue || !SUPPORTED_LOCALES.includes(localeValue as SupportedLocale)) {
    return { status: "error", message: "Choose a supported language." };
  }

  const locale = localeValue as SupportedLocale;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
  locale,
        time_zone: "Asia/Jakarta",
      },
      { onConflict: "id" },
    );

  if (error) {
    return { status: "error", message: error.message };
  }

  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/app/settings");

  return { status: "success", message: "Language preference updated." };
}
