import { NextRequest, NextResponse } from "next/server";

import { fetchOverviewCharts } from "@/lib/supabase/queries/overview";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const periodParam = searchParams.get("period") ?? undefined;

  try {
    const charts = await fetchOverviewCharts(periodParam);
    return NextResponse.json({ data: charts });
  } catch (error) {
    console.error("Failed to load overview charts", error);
    return NextResponse.json({ error: "Failed to load overview charts" }, { status: 500 });
  }
}
