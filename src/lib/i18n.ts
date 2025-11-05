import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { translate } from "@/i18n/translations";
import type { Locale, TranslationKey } from "@/i18n/translations";

const SUPPORTED_LOCALES: Locale[] = ["en", "id"];
const DEFAULT_LOCALE: Locale = "en";

function isSupportedLocale(locale: string | undefined | null): locale is Locale {
  return locale !== undefined && locale !== null && SUPPORTED_LOCALES.includes(locale as Locale);
}

export const getCurrentLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  if (isSupportedLocale(localeCookie)) {
    return localeCookie;
  }

  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return DEFAULT_LOCALE;
  }

  const { data } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle();

  if (data && isSupportedLocale(data.locale)) {
    return data.locale;
  }

  return DEFAULT_LOCALE;
});

export type Translator = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

export async function getTranslator(): Promise<{ locale: Locale; t: Translator }> {
  const locale = await getCurrentLocale();
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
  };
}
