import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error_description");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const redirectTo =
    requestUrl.searchParams.get("redirectTo") ??
    requestUrl.searchParams.get("redirect_to") ??
    requestUrl.searchParams.get("next") ??
    "/app/overview";

  if (error) {
    const params = new URLSearchParams({ error });
    return NextResponse.redirect(
      new URL(`/sign-in?${params.toString()}`, requestUrl.origin),
    );
  }

  const supabase = await createSupabaseRouteHandlerClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const params = new URLSearchParams({ error: exchangeError.message });
      return NextResponse.redirect(
        new URL(`/sign-in?${params.toString()}`, requestUrl.origin),
      );
    }
  } else if (tokenHash && otpType) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (verifyError) {
      const params = new URLSearchParams({ error: verifyError.message });
      return NextResponse.redirect(
        new URL(`/sign-in?${params.toString()}`, requestUrl.origin),
      );
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
