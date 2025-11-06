## dY Personal Finance Tracker — Project Handbook

This repository contains the Next.js App Router workspace that powers the budgeting app. The handbook captures the latest technical status, UI/UX direction, and onboarding steps for teammates (human or agent) joining midstream.

---

### 1. Stack & Architecture Snapshot

- **Framework**: Next.js 16 (App Router + Turbopack) with TypeScript
- **Styling**: Tailwind CSS with custom design tokens defined in `tailwind.config.ts`
- **UI primitives**: shadcn/ui-inspired components under `src/components/ui`
- **Data layer**: Supabase (Auth, Postgres, RLS) via `@supabase/ssr` (migration in progress from legacy helpers)
- **Forms & validation**: `react-hook-form`, `zod`
- **Icons & charts**: `lucide-react`, planned Recharts for analytics widgets

```
src/
  app/
    (auth)/         // Sign-in route & layout
    (app)/          // Authenticated workspace routes (overview, budgets, etc.)
    auth/callback   // Supabase OAuth exchange handler
    layout.tsx      // Root layout wiring Theme + Auth providers
    page.tsx        // Landing/roadmap (public)
  components/
    forms/          // Transaction forms, filter sheets
    layout/         // AppShell, theme toggle
    providers/      // Theme + Supabase auth contexts
    ui/             // Button, Card, Badge, Input, Label primitives
  config/           // Environment validation (Zod)
  lib/
    supabase/      // Supabase browser/server helpers (needs Next 16 upgrade)
    format.ts      // Currency/date formatting helpers
  types/            // Domain models (ledger, summaries)
  ...
```

See `ui-ux-roadmap.md` for the latest product/design plan.

---

### 2. Environment & Supabase Setup

1. Copy `.env.local.example` → `.env.local` and populate values from **Supabase → Project Settings → API**.
2. In Supabase dashboard:
   - **Auth → URL Configuration**: `http://localhost:3000` for development.
   - **Auth → Providers**: enable Email/Password and Google. Set redirect URL `http://localhost:3000/auth/callback` (add production domain later).
3. CLI workflow (after `npx supabase login` and `supabase link --project-ref hxrazeushtyfusxpyoeg`):

   ```bash
   pnpm db:migrate   # push schema in supabase/migrations
   pnpm db:reset     # reset local DB + run seed.sql
   pnpm db:studio    # open Supabase Studio locally
   ```

4. `supabase/migrations/202411050001_init_core.sql` seeds core tables (accounts, categories, transactions, budgets, summaries) + RLS policies + helper function `create_workspace_seed(user_id uuid)`.
5. `supabase/seed.sql` primes demo data. Run `select public.create_workspace_seed('<user_uuid>');` after creating a user.

---

### 3. Runtime Flow Overview

- Root layout fetches Supabase session server-side; `AuthProvider` hydrates client context.
- Routes under `(app)` guard anonymous visitors and redirect to `/sign-in`.
- `/auth/callback` handles OAuth exchange and forwards via `redirectTo` query (default `/app/overview`).
- `ThemeProvider` exposes light/dark toggles; design tokens power consistent theming.

---

### 4. Development Commands

```bash
pnpm install    # install dependencies
pnpm dev        # start dev server (Next picks free port if 3000 busy)
pnpm lint       # eslint (includes react-hooks, jsx-a11y rules)
pnpm build      # production build (currently blocked by Supabase helper migration)
```

**Warnings to watch:**

- Turbopack warns about multiple lockfiles; ensure root `package-lock.json` is removed.
- When testing over LAN, configure `next.config.ts` `allowedOrigins` to quiet dev warnings.

---

### 5. Current Status & Highlights (Nov 2025)

- Supabase replaces Firebase; schema, RLS, and seed helpers are in place.
- UI shell for authenticated workspace (overview, transactions, budgets, reports, accounts, imports, settings) is scaffolded.
- Transaction filters modal rebuilt with type-aware category logic and improved UX for transfer type (Nov 2025).
- `ui-ux-roadmap.md` documents unified design roadmap covering tokens, navigation, and phased delivery.
- Lint passes; build remains blocked pending new Supabase helpers (`@supabase/ssr`).

---

### 6. Open Issues / Next Steps

1. **Supabase helper upgrade (blocking build)**: migrate `src/lib/supabase/server.ts` & related utilities to `@supabase/ssr`. Current implementation fails during `pnpm build` because Next 16 now returns async cookies.
2. **Data layer queries**: finalize typed Supabase client wrappers and implement queries for accounts, categories, transactions (including paired transfers) in `src/lib/supabase/queries/*`.
3. **Summary pipeline**: add Edge Functions/cron job to refresh `category_monthly_summaries` and `account_daily_summaries`.
4. **UI hardening**: replace placeholder dashboard widgets with live data, charts, and responsive layouts per roadmap.
5. **Responsive navigation**: implement mobile bottom nav + FAB as defined in roadmap.
6. **Automation**: establish CI (lint/test) and consider Playwright for E2E once ledger flows exist.

---

### 7. Recommended Upcoming PRs

1. Migrate Supabase server helpers to `@supabase/ssr`; update browser client accordingly.
2. Generate Supabase types (`supabase gen types typescript --linked`) and apply across data utilities.
3. Implement accounts & categories CRUD flows (forms, server actions, optimistic UI).
4. Wire recent transactions fetch with filters + TanStack Table virtualization.
5. Apply design tokens + metric cards from `ui-ux-roadmap.md` to Overview page.
6. Introduce global period switcher and ensure filters respect it.
7. Set up CI pipeline (GitHub Actions) running lint + typecheck.

---

### 8. Reference Files

- `Init Budgeting Apps README.md` — initial product spec & milestones.
- `ui-ux-roadmap.md` — consolidated UX roadmap (v1.1).
- `src/lib/supabase/*` — Supabase client utils (requires upgrade).
- `src/app/(app)/transactions/page.tsx` — filter integration + table logic.
- `supabase/migrations/` & `supabase/seed.sql` — schema + seed routines.

---

### 9. Handover Notes

- Production build currently fails until Supabase helper migration is complete.
- All new UI work should align with `ui-ux-roadmap.md`; keep the roadmap updated after major changes.
- Remove legacy Firebase references; everything now assumes Supabase stack.
- Maintain this handbook as the living source of truth for agents & contributors.

> Need deeper product context? See `../Init Budgeting Apps README.md` for the original blueprint and milestones.
