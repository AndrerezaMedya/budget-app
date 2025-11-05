## dY Personal Finance Tracker - Workspace Scaffolding

Scaffolded with Next.js App Router, Tailwind CSS, and TypeScript to follow the
product blueprint described in `../Init Budgeting Apps README.md`.

### Commands

```bash
npm install     # install dependencies
npm run dev     # start dev server on http://localhost:3000
npm run build   # create production build
npm run lint    # run ESLint
```

### Current Structure

```
src/
  app/
    (auth)/         # auth routes & placeholders
    (app)/          # app workspace, AppShell layout, feature pages
    auth/callback   # Supabase OAuth exchange handler
    page.tsx        # marketing/roadmap landing page
  components/
    layout/         # AppShell, theme toggle
    providers/      # theme + Supabase auth providers
    ui/             # shadcn-style primitives (button, card, badge, input, label)
  config/           # navigation config + env validation
  lib/              # shared utils (cn, formatting helpers, supabase clients)
  types/            # domain models for ledger & summaries
```

Tailwind is configured with design tokens that mirror the budget app UI
direction (primary, accent, chart palette, radii). The custom theme provider
persists preference via `data-theme`, while Supabase helpers live in
`src/lib/supabase`.

### Supabase Configuration

1. Duplicate `.env.local.example` to `.env.local` and paste the Supabase
   settings from **Project Settings -> API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Optional (server only): `SUPABASE_SERVICE_ROLE_KEY`
2. In the Supabase dashboard:
   - **Authentication -> URL Configuration**: set the site URL to your local
     origin (e.g. `http://localhost:3000`).
   - **Authentication -> Providers**: enable Google and Email/Password. Set the
     redirect URL to `https://your-domain/auth/callback` (local + production).
3. Restart `npm run dev` after editing env vars so Next.js picks up the config.

### Database Workflow

We use the Supabase CLI (installed locally via dev dependency) to manage schema.

```bash
npm run db:migrate   # push migrations in supabase/migrations to your project
npm run db:reset     # reset local database and run migrations + seed
npm run db:studio    # open Supabase Studio locally
```

- Schema lives in `supabase/migrations`. The initial migration seeds core tables,
  enums, RLS policies, and a helper function `create_workspace_seed`.
- `supabase/seed.sql` runs automatically on `db:reset` and seeds sample accounts,
  categories, transactions, and budgets for the first auth user. Call
  `select public.create_workspace_seed('<user_uuid>');` anytime to bootstrap a
  new workspace manually.

### Next Milestones

1. **Supabase wiring** - server/client helpers, auth context, secure env handling.
2. **Ledger data layer** - Transactions CRUD + transfer pairing helpers.
3. **Materialized summaries** - Edge functions/cron for aggregated metrics.
4. **UI polish** - shadcn components (tables, sheets, dialogs) and charts.
5. **CSV tooling** - import wizard skeleton + export endpoints.

Track detailed requirements and acceptance criteria in the root blueprint
(`../Init Budgeting Apps README.md`). Each milestone should land with focused
patches and accompanying tests where applicable.

### Auth Notes

- Workspace pages (`/app/*`) are server-protected; anonymous visitors are redirected to `/sign-in`.
- `sign-in` page adds `redirectTo` query so users return after authentication.
- Supabase OAuth callbacks must point to `/auth/callback` on every environment (local + Vercel).
