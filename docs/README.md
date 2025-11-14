## dY Personal Finance Tracker — Workspace Handbook (Docs Copy)

This document mirrors the root handbook but stays close to `/app` assets so Storybook/Design builds can surface context. If you already read the root `README.md`, skim the highlights and quick links below.

---

### 1. Stack Snapshot (Nov 2025)

- Next.js 16 App Router (RSC + Turbopack) with TypeScript
- Tailwind CSS design tokens; dark-mode-first theming
- shadcn/ui-flavoured primitives in `src/components/ui`
- Supabase Auth/Postgres/RLS via `@supabase/ssr`
- Receipt ingestion backed by Google Gemini 2.5 Flash/Pro (selectable per upload)
- Transaction flows with timezone-safe datetime handling and toast notifications that respect mobile safe areas

Production build now passes (`pnpm build`).

---

### 2. Environment & Secrets Checklist

1. Copy `.env.local.example` → `.env.local`, populate:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=receipts`
- `GEMINI_API_KEY`, optional `RECEIPT_MODEL_OVERRIDE`
- `NEXT_PUBLIC_APP_URL`

2. Supabase console

- Auth redirect: `http://localhost:3000/auth/callback`
- Storage policy: apply `202511120001_receipts_storage_policy.sql`

3. CLI helpers (after `supabase link`):

```bash
pnpm db:migrate
pnpm db:reset
pnpm db:studio
```

4. Seed demo data via `select public.create_workspace_seed('<user_uuid>');`.

Gemini calls stay server-side—never expose the key to the browser.

---

### 3. Feature Highlights

- Receipt upload form polls ingestion jobs, handles signed URLs, and lets users choose Gemini Flash vs Pro.
- Review page awaits Next.js 16 async params correctly, preventing race conditions before Supabase data is ready.
- Transaction create/edit flows honour `profiles.timeZone`, eliminating the previous +7h drift when saving.
- Toast provider offsets using `--app-mobile-nav-offset`, keeping notifications visible above the bottom nav.
- Supabase clients in `src/lib/supabase` share typed helpers for actions, API routes, and RSC usage.

---

### 4. Dev Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
```

Tests/CI are on the roadmap; track items under “Active Backlog Themes.”

---

### 5. Active Backlog Themes

| Theme             | Focus                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| Receipt → Ledger  | Create ledger entries directly from processed receipts (prefill modal, allow re-scan). |
| Overview Metrics  | Replace placeholder KPI cards with live Supabase aggregates + cached API routes.       |
| Summary Jobs      | Schedule refresh of `account_daily_summaries` and `category_monthly_summaries`.        |
| Mobile Navigation | Ship bottom navigation + FAB per roadmap, leveraging toast safe-area work.             |
| Testing & CI      | Introduce Vitest/Playwright suites and GitHub Actions coverage.                        |

---

### 6. Quick References

- `../../README.md` — root handbook (full detail)
- `../../Init Budgeting Apps README.md` — product + architecture blueprint (Supabase revision)
- `../usage-guide.md` — user-facing walkthrough updated with receipt & timezone flows
- `../overview-charts-hardening.md` — perf checklist for overview charts
- `../ui-ux-roadmap.md` — design system + milestone plan
- `../../app/TODO-receipt-ingestion.md` — engineering backlog for OCR ingestion

Keep this doc aligned with the root handbook whenever priorities or stack details change.
