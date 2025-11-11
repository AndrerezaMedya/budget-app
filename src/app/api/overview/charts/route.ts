import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { fetchOverviewCharts, resolveOverviewPeriod } from "@/lib/supabase/queries/overview";
import { createSupabaseRouteHandlerClient, type SupabaseRouteClient } from "@/lib/supabase/server";

const OVERVIEW_CHARTS_CACHE_TTL_SECONDS = 60 * 5; // five minutes

function parseForceRefreshFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalised = value.toLowerCase();
  return normalised === "1" || normalised === "true" || normalised === "yes";
}

function buildCacheKey(userId: string, period: string) {
  return ["overview-charts", userId, period];
}

function buildCacheTag(userId: string, period: string) {
  return `overview-charts:${userId}:${period}`;
}

async function getOverviewChartsForRequest(
  userId: string,
  periodParam: string | undefined,
  forceRefresh: boolean,
  supabase: SupabaseRouteClient,
) {
  const { period } = resolveOverviewPeriod(periodParam);
  const cacheKey = buildCacheKey(userId, period);
  const cacheTag = buildCacheTag(userId, period);

  const loadCharts = unstable_cache(
    async () => fetchOverviewCharts(periodParam, { client: supabase, userId }),
    cacheKey,
    {
      revalidate: OVERVIEW_CHARTS_CACHE_TTL_SECONDS,
      tags: [cacheTag],
    },
  );

  if (forceRefresh) {
    return fetchOverviewCharts(periodParam, { client: supabase, userId });
  }

  return loadCharts();
}

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
  const forceRefresh = parseForceRefreshFlag(searchParams.get("force-refresh"));

  try {
    const charts = await getOverviewChartsForRequest(
      user.id,
      periodParam,
      forceRefresh,
      supabase,
    );
    return NextResponse.json({ data: charts });
  } catch (error) {
    console.error("Failed to load overview charts", {
      userId: user.id,
      period: periodParam ?? null,
      forceRefresh,
      error,
    });
    return NextResponse.json({ error: "Failed to load overview charts" }, { status: 500 });
  }
}
