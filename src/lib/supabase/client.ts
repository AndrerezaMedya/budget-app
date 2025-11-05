import { createBrowserClient } from "@supabase/ssr";
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

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
    );
  }
  return browserClient;
}
