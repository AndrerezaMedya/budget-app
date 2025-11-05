import type { ReactNode } from "react";

import { DEFAULT_CURRENCY } from "@/config/currencies";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/i18n";
import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchRecentTransactions } from "@/lib/supabase/queries/transactions";
import { fetchTags } from "@/lib/supabase/queries/tags";
import { fetchProfilePreferences } from "@/lib/supabase/queries/profile";
import { CreateTransactionForm } from "@/components/forms/create-transaction-form";
import { DeleteTransactionButton } from "../../../components/forms/delete-transaction-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TranslationKey } from "@/i18n/translations";

type TableColumn = {
  id: "date" | "account" | "category" | "description" | "amount" | "actions";
  headerKey: TranslationKey;
  placeholderKey: TranslationKey;
  cellClass: string;
  align?: "left" | "right";
};

const TABLE_COLUMNS: TableColumn[] = [
  {
    id: "date",
    headerKey: "transactions.table.header.date",
    placeholderKey: "transactions.table.placeholder.date",
    cellClass: "text-muted-foreground",
  },
  {
    id: "account",
    headerKey: "transactions.table.header.account",
    placeholderKey: "transactions.table.placeholder.account",
    cellClass: "text-muted-foreground",
  },
  {
    id: "category",
    headerKey: "transactions.table.header.category",
    placeholderKey: "transactions.table.placeholder.category",
    cellClass: "text-muted-foreground",
  },
  {
    id: "description",
    headerKey: "transactions.table.header.description",
    placeholderKey: "transactions.table.placeholder.description",
    cellClass: "text-muted-foreground",
  },
  {
    id: "amount",
    headerKey: "transactions.table.header.amount",
    placeholderKey: "transactions.table.placeholder.amount",
    cellClass: "text-right font-medium text-foreground",
    align: "right",
  },
  {
    id: "actions",
    headerKey: "transactions.table.header.actions",
    placeholderKey: "transactions.table.placeholder.actions",
    cellClass: "text-right",
    align: "right",
  },
];

const EMPTY_STATE_ROWS = 6;

function formatDateTimeLocalInput(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get("year");
  const month = byType.get("month");
  const day = byType.get("day");
  const hour = byType.get("hour");
  const minute = byType.get("minute");

  if (!year || !month || !day || !hour || !minute) {
    return date.toISOString().slice(0, 16);
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

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
  const { t } = await getTranslator();
  const [{ accounts }, tags, recentTransactions, profile] = await Promise.all([
    fetchAccounts(),
    fetchTags(),
    fetchRecentTransactions(25),
    fetchProfilePreferences(),
  ]);

  const availableAccounts = accounts.filter((account) => !account.archived_at);
  const accountOptions = availableAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency,
    currentBalanceMinor: account.current_balance_minor,
  }));

  const tagOptions = tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }));

  const timeZone = profile?.timeZone ?? "Asia/Jakarta";
  const defaultOccurredAt = formatDateTimeLocalInput(new Date(), timeZone);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("transactions.page.heading")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("transactions.page.subheading")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-2">
          <Button variant="outline" disabled>
            {t("transactions.button.import")}
          </Button>
          <CreateTransactionForm
            accounts={accountOptions}
            tags={tagOptions}
            defaultOccurredAt={defaultOccurredAt}
          />
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("transactions.recent.title")}</CardTitle>
            <CardDescription>{t("transactions.recent.description")}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" disabled>
            {t("transactions.recent.filters")}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="hidden min-w-full divide-y divide-border text-sm md:table">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {TABLE_COLUMNS.map((column) => (
                    <th
                      key={column.id}
                      className={`px-4 py-3 ${column.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {t(column.headerKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {recentTransactions.length === 0
                  ? Array.from({ length: EMPTY_STATE_ROWS }).map((_, index) => (
                      <tr key={index}>
                        {TABLE_COLUMNS.map((column) => (
                          <td
                            key={column.id}
                            className={`px-4 py-4 text-muted-foreground ${column.align === "right" ? "text-right" : "text-left"}`}
                          >
                            {t(column.placeholderKey)}
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
                      const amountDisplay = formatCurrency(signedAmount, transaction.currency ?? undefined);
                      const occurredOn = formatDate(transaction.occurredAt);

                      return (
                        <tr key={transaction.id}>
                          {TABLE_COLUMNS.map((column) => {
                            let content: ReactNode = null;

                            switch (column.id) {
                              case "date":
                                content = occurredOn;
                                break;
                              case "account":
                                content = transaction.account
                                  ? `${transaction.account.name} (${(transaction.currency ?? DEFAULT_CURRENCY).toUpperCase()})`
                                  : "—";
                                break;
                              case "category":
                                content = transaction.category?.name ?? "—";
                                break;
                              case "description":
                                content = transaction.description ?? "—";
                                break;
                              case "amount":
                                content = amountDisplay;
                                break;
                              case "actions":
                                content = (
                                  <DeleteTransactionButton
                                    transactionId={transaction.id}
                                    description={transaction.description}
                                  />
                                );
                                break;
                              default:
                                content = null;
                            }

                            return (
                              <td key={column.id} className={`px-4 py-3 ${column.cellClass}`}>
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
            <div className="flex flex-col gap-2 p-6 text-center text-sm text-muted-foreground md:hidden">
              {t("transactions.table.mobileIncoming")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
