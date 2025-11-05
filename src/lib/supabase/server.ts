import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
}

if (!supabaseAnonKeyEnv) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined");
}

const supabaseUrl = supabaseUrlEnv;
const supabaseAnonKey = supabaseAnonKeyEnv;

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type SupabaseCookie = {
  name: string;
  value: string;
  options?: Parameters<CookieStore["set"]>[2];
};

function createSupabaseClientWithCookies(
  cookieStore: CookieStore,
  { allowCookieWrite }: { allowCookieWrite: boolean },
): SupabaseClient<Database> {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            if (allowCookieWrite) {
              throw error;
            }
          }
        }
      },
    },
  });
}

export async function createSupabaseServerComponentClient() {
  const cookieStore = await cookies();
  return createSupabaseClientWithCookies(cookieStore, {
    allowCookieWrite: false,
  });
}

export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies();
  return createSupabaseClientWithCookies(cookieStore, {
    allowCookieWrite: true,
  });
}
