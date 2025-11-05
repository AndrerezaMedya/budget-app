export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-muted">
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 text-center sm:text-left">
          <div className="rounded-full bg-secondary/70 px-4 py-1 text-sm text-secondary-foreground shadow-sm sm:self-start">
            Personal finance, rebuilt for humans on the go.
          </div>
          <div className="space-y-6">
            <h1 className="text-pretty text-4xl font-semibold sm:text-5xl lg:text-6xl">
              Own your money flow with an offline-first budgeting cockpit.
            </h1>
            <p className="text-pretty text-lg text-muted-foreground sm:text-xl">
              Track transactions, balances, and budgets in one place. Syncs
              seamlessly with Supabase, works offline, and keeps summaries ready
              for instant dashboards.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              href="/sign-in"
            >
              Launch the app
            </a>
            <a
              className="inline-flex items-center justify-center rounded-lg border border-input px-6 py-3 text-base font-medium text-foreground shadow-sm transition hover:bg-muted"
              href="#roadmap"
            >
              View milestone roadmap
            </a>
          </div>
          <dl className="grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                label: "Accounts & transfers",
                detail: "Linked double-entry ledger",
              },
              {
                label: "Realtime summaries",
                detail: "Materialized metrics per account & category",
              },
              {
                label: "CSV workflows",
                detail: "Import, map, dedupe, export anytime",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-card/80 p-4 shadow-sm"
              >
                <dt className="text-sm font-semibold text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="text-base font-medium">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section
        id="roadmap"
        className="border-t border-border bg-card/50 px-6 py-16 sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Roadmap at a glance</h2>
            <p className="text-muted-foreground">
              Implementation follows seven milestones covering auth, ledger,
              budgeting, CSV workflows, and deployment. Each milestone ships as
              its own cohesive slice so the product stays stable.
            </p>
          </div>
          <ul className="grid gap-3 text-sm text-muted-foreground">
            {[
              "Milestone 0 · Project scaffolding, design tokens, provider shells.",
              "Milestone 1 · Supabase Auth integration with email and Google.",
              "Milestone 2 · Account and category management with opening balances.",
              "Milestone 3 · Transaction engine with paired transfer logic.",
            ].map((item) => (
              <li
                key={item}
                className="rounded-lg border border-border bg-background/80 p-4 shadow-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
