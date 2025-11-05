import { formatCurrency, formatDate } from "@/lib/format";
import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchCategories } from "@/lib/supabase/queries/categories";
import { fetchRecentTransactions } from "@/lib/supabase/queries/transactions";
import { CreateTransactionForm } from "@/components/forms/create-transaction-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const HEADERS = ["Date", "Account", "Category", "Description", "Amount"];

const EMPTY_STATE_ROWS = 6;

function deriveSignedAmount(
  amountMinor: number,
  type: "income" | "expense" | "transfer",
  direction: "in" | "out" | null,
) {
  if (type === "income" || (type === "transfer" && direction === "in")) {
    return amountMinor;
  }
  if (type === "expense" || (type === "transfer" && direction === "out")) {
    return amountMinor * -1;
  }
  return amountMinor;
}

export default async function TransactionsPage() {
  const [{ accounts }, categories, recentTransactions] = await Promise.all([
    fetchAccounts(),
    fetchCategories(),
    fetchRecentTransactions(25),
  ]);

  const availableAccounts = accounts.filter((account) => !account.archived_at);
  const accountOptions = availableAccounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  const defaultOccurredAt = new Date().toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Live ledger feed sourced from Supabase. Transfers render with paired
            rows once mutations land.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-2">
          <Button variant="outline" disabled>
            Import CSV
          </Button>
          <CreateTransactionForm
            accounts={accountOptions}
            categories={categories}
            defaultOccurredAt={defaultOccurredAt}
          />
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Supabase `transactions` table ordered by `occurred_at`.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" disabled>
            Filters
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="hidden min-w-full divide-y divide-border text-sm md:table">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {HEADERS.map((header) => (
                    <th key={header} className="px-4 py-3 text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {recentTransactions.length === 0
                  ? Array.from({ length: EMPTY_STATE_ROWS }).map((_, index) => (
                      <tr key={index}>
                        {HEADERS.map((header) => (
                          <td
                            key={header}
                            className="px-4 py-4 text-muted-foreground"
                          >
                            No {header.toLowerCase()} yet
                          </td>
                        ))}
                      </tr>
                    ))
                  : recentTransactions.map((transaction) => {
                      const signedAmount = deriveSignedAmount(
                        transaction.amountMinor,
                        transaction.type,
                        transaction.transferDirection,
                      );
                      const amountDisplay = formatCurrency(signedAmount);
                      const occurredOn = formatDate(transaction.occurredAt);

                      return (
                        <tr key={transaction.id}>
                          <td className="px-4 py-3 text-muted-foreground">
                            {occurredOn}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {transaction.account?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {transaction.category?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {transaction.description ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">
                            {amountDisplay}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
            <div className="flex flex-col gap-2 p-6 text-center text-sm text-muted-foreground md:hidden">
              Mobile friendly list view coming soon.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
