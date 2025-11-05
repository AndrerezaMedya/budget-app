import { cookies } from "next/headers";
import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";

export async function createSupabaseServerComponentClient() {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: () => cookieStore,
  });
}

export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({
    cookies: () => cookieStore,
  });
}
