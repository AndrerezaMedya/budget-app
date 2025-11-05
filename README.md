## dY Personal Finance Tracker — Project Handbook

This repo hosts the Next.js App Router implementation that backs the "Init Budgeting Apps README" blueprint. Treat this document as the source of truth for teammates (human or agent) joining midstream.

### 1. Current Stack Snapshot
- **Framework**: Next.js 16 (App Router + Turbopack) with TypeScript
- **Styling**: Tailwind CSS + design tokens defined in `tailwind.config.ts`
- **UI primitives**: shadcn-inspired components under `src/components/ui`
- **Auth & data**: Supabase (Auth, Postgres, RLS) via `@supabase/auth-helpers-nextjs`
- **Forms & validation**: `react-hook-form`, `zod`

```
src/
  app/
    (auth)/         // Sign-in route & layout
    (app)/          // Authenticated workspace routes (overview, budgets, etc.)
    auth/callback   // Supabase OAuth exchange handler
    layout.tsx      // Root layout wiring Theme + Auth providers
    page.tsx        // Marketing landing + roadmap
  components/
    layout/         // AppShell, theme toggle
    providers/      // Theme + Supabase auth contexts
    ui/             // Button, Card, Badge, Input, Label primitives
  config/           // Environment validation (Zod)
  lib/
    supabase/      // Supabase browser/server helpers (needs Next 16 fix)
    format.ts      // Currency/date formatting helpers
  types/            // Domain models (ledger, summaries)
  ...
```

### 2. Supabase Setup
1. Copy `.env.local.example` → `.env.local` and fill values from Supabase **Project Settings → API**.
2. Supabase console:
   - **Auth → URL Configuration**: site URL `http://localhost:3000` for local dev.
   - **Auth → Providers**: enable Google + Email/Password. Redirect URL `http://localhost:3000/auth/callback` (later add Vercel URL).
3. CLI workflow (after `npx supabase login` + `supabase link --project-ref hxrazeushtyfusxpyoeg`):
   ```bash
   npm run db:migrate   # push schema in supabase/migrations
   npm run db:reset     # reset local DB + run seed.sql
   npm run db:studio    # launch local Supabase Studio
   ```
4. `supabase/migrations/202411050001_init_core.sql` creates accounts, categories, transactions, budgets, summaries, RLS policies, and helper `create_workspace_seed(user_id uuid)`.
5. `supabase/seed.sql` populates demo data for the first auth user. Call `select public.create_workspace_seed('<user_uuid>');` whenever a fresh workspace is needed.

### 3. Auth Flow Overview
- Root layout fetches the Supabase session server-side and hydrates the client `AuthProvider`.
- Workspace routes under `(app)` redirect anonymous visitors to `/sign-in`.
- `/auth/callback` exchanges OAuth codes and forwards to the `redirectTo` query (default `/app/overview`).
- `ThemeProvider` stores light/dark preference through a `data-theme` attribute.

### 4. Local Development Commands
```bash
npm install     # install dependencies
npm run dev     # start dev server (Next chooses free port if 3000 busy)
npm run lint    # eslint
npm run build   # production build (currently failing, see Open Issues)
```
**Next.js warnings to note**
- Turbopack sees multiple lockfiles: remove the root `package-lock.json` or configure `turbopack.root` in `next.config.ts`.
- Dev server emits a cross-origin warning for network testing; configure `allowedDevOrigins` if you routinely access via another device.

### 5. Status & Recent Work
- Firebase removed; Supabase auth + Postgres migration in place.
- Schema + RLS created with helper seed function.
- Basic authenticated UI shell, landing page roadmap, and placeholder workspace modules (overview, accounts, transactions, budgets, reports, imports, settings).
- Supabase auth context & theme provider implemented; lint passes.

### 6. Open Issues / Follow-up Tasks
1. **Supabase helper upgrade (blocking build)**: Next.js 16 treats `cookies()` as async. `src/lib/supabase/server.ts` currently obtains cookies synchronously; helper still expects sync handlers. Build fails (`npm run build`) with `Type 'ReadonlyRequestCookies' is missing ...`. Recommended fix: adopt the new `@supabase/ssr` helpers or adjust to the updated API once the auth-helpers package releases compatibility. Until resolved, production build cannot succeed.
2. **Workspace layout dynamic behaviour**: `layout.tsx` and `(app)/layout.tsx` are marked `dynamic = "force-dynamic"`. Revisit once data fetching and caching strategy are defined.
3. **Ledger data layer (next milestone)**: Implement Supabase queries/mutations for accounts, categories, transactions, and paired transfers. Ensure summaries stay consistent.
4. **Summary pipeline**: Add Supabase Edge Functions / cron jobs to maintain `category_monthly_summaries` & `account_daily_summaries`.
5. **UI placeholders**: Replace static dashboard cards/tables with live data (likely via React Query + charts).
6. **Warnings clean-up**: Address Turbopack root warning and configure `allowedDevOrigins`.
7. **Automation**: Set up unit/E2E tests and CI workflows once the data layer is in place.

### 7. Immediate PR Suggestions
1. **Fix Supabase server helpers** (unblocks `npm run build`). Consider migrating to `@supabase/ssr` and removing deprecated helpers.
2. **Typed Supabase clients**: introduce generated types (e.g., via `supabase gen types typescript ...`) and wrap `createBrowserSupabaseClient<Database>()` / server equivalents.
3. **Accounts & categories CRUD UI**: implement forms + server actions.
4. **Transactions engine + transfer logic**.
5. **Materialized summary recomputation** (Edge Functions + scheduled tasks).
6. **Dashboard visualisations** with real metrics (Recharts/Chart.js) and filterable tables.
7. **CI setup**: lint/test GitHub Actions, Vercel deployment instructions.

### 8. Key Files to Review
- `Init Budgeting Apps README.md` (root) — authoritative product spec & milestones.
- `src/app/layout.tsx`, `src/app/(app)/layout.tsx` — server-side session guard (needs helper fix).
- `src/app/auth/callback/route.ts` — OAuth exchange (ensuring it awaits route helper).
- `src/components/providers/auth-provider.tsx` — Supabase auth context.
- `src/lib/supabase/*` — Supabase client utilities (primary location of blocking issue).
- `supabase/migrations/202411050001_init_core.sql` & `supabase/seed.sql` — schema + seeds.

### 9. Handover Notes
- Current build is **failing** because of the async cookies change. Resolve this before integrating new features.
- Firebase artifacts are removed; everything assumes Supabase.
- After fixing auth helpers, prioritize ledger CRUD + summary logic as outlined in the blueprint.
- Keep this README updated as tasks progress; future agents depend on it for context.

> Reference blueprint: `../Init Budgeting Apps README.md`
