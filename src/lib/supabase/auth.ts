import "server-only";

import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export async function requireUserId() {
  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to resolve current user: ${error.message}`);
  }

  if (!user) {
    throw new Error("User session is required");
  }

  return user.id;
}
