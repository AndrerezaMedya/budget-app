# Overview Charts Hardening Checklist

This guide tracks the remaining work to make the overview charts resilient across larger datasets, multiple users, and varied deployment environments.

## 1. Data Integrity & Materialization

- [x] Schedule a Supabase function or cron to refresh `category_monthly_summaries` and any cashflow materialized tables after inserts/updates.
- [x] Backfill historical data on deploy so new environments start with precomputed summaries.
- [x] Enforce category assignment (RLS + constraints) to prevent `null` category IDs that would skip the donut.
- [x] Add migration scripts that validate the presence of required summary rows per period.

## 2. API Layer & Caching

- [x] Move `fetchOverviewCharts` into a dedicated revalidated cache (e.g., Next.js Route Handler with `revalidate` or Supabase Edge Function) to avoid recomputing for each request.
- [x] Honour `force-refresh` query flag to bypass cache during manual revalidation.
- [x] Memoize by `(userId, period)` key to keep user data isolated but reusable across tabs/devices.

## 3. Configuration & Environment Safety

- [x] Promote a single source for the public app origin (e.g., `NEXT_PUBLIC_APP_URL`) and fall back only when absent.
- [x] Document env requirements for local vs. deployed (headers available, protocol expectations).
- [x] Add runtime guard that throws a descriptive error if the API route cannot be contacted (instead of silent fallback).

> Deployment origins
>
> - Local development: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
> - Staging/preview: `NEXT_PUBLIC_APP_URL=https://budget-app-five-coral.vercel.app`
> - Production: domain pending (fall back to forwarded host headers until configured)

## 4. Client Resilience

- [x] Surface UI warnings when charts fallback to direct Supabase calls, so the user knows data may be stale.
- [x] Allow manual retry from the UI when the API route responds with non-200 status.
- [x] Capture and log the failing period/user metadata for observability.

> When the API fallback is triggered, the overview page now renders a localized warning banner with a retry control that re-hits `/api/overview/charts?force-refresh=1` and refreshes the view after success. The banner reveals the last API error and all API route failures log the requesting user, period, and retry intent.

## 5. Performance & Limits

- [ ] Apply a configurable cap on categories included in the donut and aggregate the remainder.
- [ ] Add pagination/streaming support for the cashflow endpoint to handle >365 days.
- [ ] Benchmark query latency with realistic data volumes (e.g., 100k transactions) and record findings.

## 6. Testing & Monitoring

- [ ] Write integration tests covering API route + fallback combination.
- [ ] Add smoke tests that simulate missing env headers (`x-forwarded-host`, etc.).
- [ ] Instrument the API route with metrics (duration, Supabase errors) and ship logs to the monitoring stack.
- [ ] Periodically verify charts rendering under multiple locales (ID, EN).

## 7. Deployment Checklist

- [ ] Ensure Supabase seeding includes non-empty category summaries for demo/staging.
- [ ] Run `pnpm lint && pnpm test` (once tests are in place) pre-deploy.
- [ ] Update release notes with chart changes and known limitations.
