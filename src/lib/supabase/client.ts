import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

let browserClient:
  | ReturnType<typeof createBrowserSupabaseClient>
  | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  return browserClient;
}
