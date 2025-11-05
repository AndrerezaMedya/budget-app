import { Clock, Layers3, Plus, Wallet } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/format";
import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACCOUNT_TYPE_LABEL: Record<
  Database["public"]["Enums"]["account_type"],
  string
> = {
  bank: "Bank account",
  cash: "Cash wallet",
  wallet: "Digital wallet",
  credit: "Credit account",
  investment: "Investment",
  savings: "Savings account",
  other: "Other",
};

export default async function AccountsPage() {
  const { accounts } = await fetchAccounts();
  const activeAccounts = accounts.filter((account) => !account.archived_at);
  const archivedAccounts = accounts.filter((account) => account.archived_at);

  const totalOpeningBalance = activeAccounts.reduce(
    (sum, account) => sum + account.opening_balance_minor,
    0,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Accounts seed balance history and drive transfer pairing. Build out
            the ledger here before wiring categories and budgets.
          </p>
        </div>
        <Button type="button" className="inline-flex items-center gap-2" disabled>
          <Plus className="size-4" aria-hidden="true" />
          Add account
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Active accounts</CardTitle>
              <CardDescription>Synced from Supabase</CardDescription>
            </div>
            <Wallet className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeAccounts.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Accounts with available balance in the workspace.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Opening balance</CardTitle>
              <CardDescription>Current sum (minor units)</CardDescription>
            </div>
            <Layers3 className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {formatCurrency(totalOpeningBalance)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Based on `opening_balance_minor` values stored in Supabase.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Archived accounts</CardTitle>
              <CardDescription>Hidden from day-to-day use</CardDescription>
            </div>
            <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{archivedAccounts.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Archived accounts keep historical ledger data intact.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>No accounts yet</CardTitle>
              <CardDescription>
                Seed data by running the Supabase seed function or manually add an
                account once mutations are wired.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          accounts.map((account) => {
            const typeLabel = ACCOUNT_TYPE_LABEL[account.type] ?? "Account";
            const openingBalance = formatCurrency(account.opening_balance_minor);
            const createdAt = formatDate(account.created_at);

            return (
              <Card key={account.id} className="flex flex-col justify-between">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-semibold">
                      {account.name}
                    </CardTitle>
                    {account.archived_at ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : null}
                  </div>
                  <CardDescription>{typeLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      Opening balance
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {openingBalance}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      Currency
                    </p>
                    <p>{account.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      Added on
                    </p>
                    <p>{createdAt}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
