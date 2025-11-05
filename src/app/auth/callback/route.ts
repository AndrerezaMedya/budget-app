import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error_description");
  const redirectTo = requestUrl.searchParams.get("redirectTo") ?? "/app/overview";

  if (error) {
    const params = new URLSearchParams({ error });
    return NextResponse.redirect(
      new URL(`/sign-in?${params.toString()}`, requestUrl.origin),
    );
  }

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
