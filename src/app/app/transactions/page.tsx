import type { ReactNode } from "react";

import { ACCOUNT_CURRENCY_OPTIONS, DEFAULT_CURRENCY, getCurrencyDecimals } from "@/config/currencies";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/i18n";
import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchRecentTransactions } from "@/lib/supabase/queries/transactions";
import { fetchRecentReceipts } from "@/lib/supabase/queries/receipts";
import { fetchTags } from "@/lib/supabase/queries/tags";
import { fetchProfilePreferences } from "@/lib/supabase/queries/profile";
import { CreateTransactionForm } from "@/components/forms/create-transaction-form";
import { DeleteTransactionButton } from "@/components/forms/delete-transaction-button";
import { EditTransactionButton } from "@/components/forms/edit-transaction-button";
import {
  TransactionsFilterButton,
  type TransactionFilterValues,
  type FilterMessages,
} from "@/components/forms/transactions-filter-button";
import { UploadReceiptForm } from "@/components/forms/upload-receipt-form";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TranslationKey } from "@/i18n/translations";
import { listPredefinedCategoriesByType } from "@/config/category-definitions";
import type { HydratedReceipt } from "@/lib/supabase/queries/receipts";
import type { Database } from "@/types/supabase";

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

type TransactionType = Database["public"]["Enums"]["transaction_type"];

const TRANSACTION_TYPE_SET = new Set<TransactionType>(["expense", "income", "transfer"]);
const SUPPORTED_FILTER_CURRENCIES = new Set(
  ACCOUNT_CURRENCY_OPTIONS.map((option) => option.value.toUpperCase()),
);

type ReceiptStatus = NonNullable<HydratedReceipt["jobStatus"]>;

const RECEIPT_STATUS_LABEL_KEYS: Record<ReceiptStatus, TranslationKey> = {
  pending: "transactions.receipts.status.pending",
  processing: "transactions.receipts.status.processing",
  succeeded: "transactions.receipts.status.succeeded",
  failed: "transactions.receipts.status.failed",
};

const RECEIPT_STATUS_BADGE_VARIANT: Record<ReceiptStatus, BadgeProps["variant"]> = {
  pending: "secondary",
  processing: "secondary",
  succeeded: "default",
  failed: "destructive",
};

type SearchParamRecord = Record<string, string | string[]>;
type SearchParamsInput = SearchParamRecord | Promise<SearchParamRecord> | undefined;

function getParamValue(params: SearchParamRecord | undefined, key: string): string | undefined {
  if (!params) {
    return undefined;
  }
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

function parseFilters(searchParams: SearchParamRecord | undefined): TransactionFilterValues {
  const rawType = getParamValue(searchParams, "type");
  const type = rawType && TRANSACTION_TYPE_SET.has(rawType as TransactionType)
    ? (rawType as TransactionType)
    : undefined;

  const accountId = getParamValue(searchParams, "accountId")?.trim() || undefined;

  const categoryParam = getParamValue(searchParams, "category")?.trim() || undefined;
  let categoryParentSlug: string | undefined;
  let categoryChildSlug: string | undefined;
  if (categoryParam) {
    const [parent, child] = categoryParam.split("/", 2);
    categoryParentSlug = parent?.trim() || undefined;
    categoryChildSlug = child?.trim() || undefined;
  }

  if (type === "transfer") {
    categoryParentSlug = undefined;
    categoryChildSlug = undefined;
  }

  const rawCurrency = getParamValue(searchParams, "currency");
  const currencyCandidate = rawCurrency ? rawCurrency.toUpperCase() : undefined;
  const currency = currencyCandidate && SUPPORTED_FILTER_CURRENCIES.has(currencyCandidate)
    ? currencyCandidate
    : undefined;

  const minAmount = getParamValue(searchParams, "minAmount")?.trim() || undefined;
  const maxAmount = getParamValue(searchParams, "maxAmount")?.trim() || undefined;
  const startDate = getParamValue(searchParams, "startDate")?.trim() || undefined;
  const endDate = getParamValue(searchParams, "endDate")?.trim() || undefined;

  return {
    type,
    accountId,
    categoryParentSlug,
    categoryChildSlug,
    currency,
    minAmount,
    maxAmount,
    startDate,
    endDate,
  };
}

function parseAmountToMinor(value: string | undefined, currency: string): number | null {
  if (!value) {
    return null;
  }
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  return Math.round(numeric * factor);
}

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

async function resolveSearchParams(input: SearchParamsInput): Promise<SearchParamRecord | undefined> {
  if (!input) {
    return undefined;
  }

  if (typeof (input as PromiseLike<SearchParamRecord>).then === "function") {
    try {
      return await (input as PromiseLike<SearchParamRecord>);
    } catch {
      return undefined;
    }
  }

  return input;
}

export default async function TransactionsPage({ searchParams }: { searchParams?: SearchParamsInput }) {
  const { t } = await getTranslator();
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const filters = parseFilters(resolvedSearchParams);
  const [{ accounts }, tags, recentTransactions, profile, recentReceipts] = await Promise.all([
    fetchAccounts(),
    fetchTags(),
    fetchRecentTransactions(25),
    fetchProfilePreferences(),
    fetchRecentReceipts(8),
  ]);

  const availableAccounts = accounts.filter((account) => !account.archived_at);
  const accountOptions = availableAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency,
    currentBalanceMinor: account.current_balance_minor,
  }));
  const receiptAccountOptions = availableAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: (account.currency ?? DEFAULT_CURRENCY).toUpperCase(),
  }));

  const tagOptions = tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }));

  const filterAccountOptions = accountOptions.map((account) => ({
    id: account.id,
    label: `${account.name} (${(account.currency ?? DEFAULT_CURRENCY).toUpperCase()})`,
  }));

  const typeOptions = [
    { value: "expense" as TransactionType, label: t("transactions.type.expense") },
    { value: "income" as TransactionType, label: t("transactions.type.income") },
    { value: "transfer" as TransactionType, label: t("transactions.type.transfer") },
  ];

  const translateCategoryName = (key: string | null | undefined, fallback: string) =>
    key ? t(key as Parameters<typeof t>[0]) : fallback;

  const categoryFilterOptions = (["expense", "income"] as const).flatMap((categoryType) => {
    const typeLabel =
      categoryType === "expense"
        ? t("transactions.type.expense")
        : t("transactions.type.income");
    return listPredefinedCategoriesByType(categoryType).map((category) => ({
      type: categoryType,
      slug: category.slug,
      label: `${translateCategoryName(category.nameKey, category.name)} (${typeLabel})`,
      children: (category.subcategories ?? []).map((subcategory) => ({
        slug: subcategory.slug,
        label: translateCategoryName(subcategory.nameKey, subcategory.name),
      })),
    }));
  });

  const initialFilterValues: TransactionFilterValues = { ...filters };

  const timeZone = profile?.timeZone ?? "Asia/Jakarta";
  const defaultOccurredAt = formatDateTimeLocalInput(new Date(), timeZone);

  const amountCurrencyCandidate = filters.currency ?? (filters.minAmount || filters.maxAmount ? DEFAULT_CURRENCY : undefined);
  const normalizedAmountCurrency = amountCurrencyCandidate ? amountCurrencyCandidate.toUpperCase() : undefined;
  const minMinor = normalizedAmountCurrency ? parseAmountToMinor(filters.minAmount, normalizedAmountCurrency) : null;
  const maxMinor = normalizedAmountCurrency ? parseAmountToMinor(filters.maxAmount, normalizedAmountCurrency) : null;

  const startTimestampRaw = filters.startDate ? Date.parse(`${filters.startDate}T00:00:00.000Z`) : Number.NaN;
  const endTimestampRaw = filters.endDate ? Date.parse(`${filters.endDate}T23:59:59.999Z`) : Number.NaN;
  const startTimestamp = Number.isNaN(startTimestampRaw) ? null : startTimestampRaw;
  const endTimestamp = Number.isNaN(endTimestampRaw) ? null : endTimestampRaw;

  const filteredTransactions = recentTransactions.filter((transaction) => {
    const transactionCurrency = (transaction.currency ?? DEFAULT_CURRENCY).toUpperCase();

    if (filters.type && transaction.type !== filters.type) {
      return false;
    }

    if (filters.accountId && transaction.accountId !== filters.accountId) {
      return false;
    }

    if (filters.categoryParentSlug) {
      if (filters.categoryChildSlug) {
        if (
          transaction.categorySlug !== filters.categoryParentSlug ||
          transaction.subcategorySlug !== filters.categoryChildSlug
        ) {
          return false;
        }
      } else if (transaction.categorySlug !== filters.categoryParentSlug) {
        return false;
      }
    }

    if (filters.currency && transactionCurrency !== filters.currency) {
      return false;
    }

    if (normalizedAmountCurrency) {
      if (transactionCurrency !== normalizedAmountCurrency) {
        return false;
      }
      if (minMinor !== null && transaction.amountMinor < minMinor) {
        return false;
      }
      if (maxMinor !== null && transaction.amountMinor > maxMinor) {
        return false;
      }
    }

    if (startTimestamp !== null || endTimestamp !== null) {
      const occurredTimestamp = Date.parse(transaction.occurredAt);
      if (Number.isNaN(occurredTimestamp)) {
        return false;
      }
      if (startTimestamp !== null && occurredTimestamp < startTimestamp) {
        return false;
      }
      if (endTimestamp !== null && occurredTimestamp > endTimestamp) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters = Boolean(
    filters.type ||
      filters.accountId ||
      filters.categoryParentSlug ||
      filters.categoryChildSlug ||
      filters.currency ||
      filters.minAmount ||
      filters.maxAmount ||
      filters.startDate ||
      filters.endDate,
  );

  const filterMessages: FilterMessages = {
    title: t("transactions.filters.title"),
    type: t("transactions.filters.type"),
    account: t("transactions.filters.account"),
    category: t("transactions.filters.category"),
    subcategory: t("transactions.filters.subcategory"),
    currency: t("transactions.filters.currency"),
    currencyPlaceholder: t("transactions.filters.currency.placeholder"),
    amountMin: t("transactions.filters.amountMin"),
    amountMax: t("transactions.filters.amountMax"),
    amountHelp: t("transactions.filters.amount.help"),
    dateStart: t("transactions.filters.dateStart"),
    dateEnd: t("transactions.filters.dateEnd"),
    apply: t("transactions.filters.apply"),
    reset: t("transactions.filters.reset"),
    close: t("transactions.filters.close"),
    none: t("transactions.filters.none"),
    categoryPlaceholder: t("transactions.filters.category.placeholder"),
    subcategoryPlaceholder: t("transactions.filters.subcategory.placeholder"),
    categorySelectType: t("transactions.filters.category.selectType"),
    subcategorySelectCategory: t("transactions.filters.subcategory.selectCategory"),
    categoryTransferDisabled: t("transactions.filters.category.transferDisabled"),
  };

  const getReceiptStatusLabel = (status: HydratedReceipt["jobStatus"]) => {
    if (!status) {
      return t("transactions.receipts.status.unknown");
    }
    return t(RECEIPT_STATUS_LABEL_KEYS[status]);
  };

  const getReceiptStatusVariant = (status: HydratedReceipt["jobStatus"]): BadgeProps["variant"] => {
    if (!status) {
      return "outline";
    }
    return RECEIPT_STATUS_BADGE_VARIANT[status];
  };

  const formatReceiptConfidence = (confidence: HydratedReceipt["confidence"]) => {
    if (confidence === null) {
      return "—";
    }
    return t("transactions.receipts.confidence.value", {
      value: Math.round(confidence * 100),
    });
  };

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
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("transactions.recent.title")}</CardTitle>
            <CardDescription>{t("transactions.recent.description")}</CardDescription>
          </div>
          <TransactionsFilterButton
            triggerLabel={t("transactions.recent.filters")}
            hasActiveFilters={hasActiveFilters}
            accounts={filterAccountOptions}
            categories={categoryFilterOptions}
            currencyOptions={ACCOUNT_CURRENCY_OPTIONS}
            typeOptions={typeOptions}
            initialFilters={initialFilterValues}
            messages={filterMessages}
          />
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
                {filteredTransactions.length === 0
                  ? hasActiveFilters
                    ? (
                        <tr>
                          <td
                            colSpan={TABLE_COLUMNS.length}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            {t("transactions.filters.noResults")}
                          </td>
                        </tr>
                      )
                    : Array.from({ length: EMPTY_STATE_ROWS }).map((_, index) => (
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
                  : filteredTransactions.map((transaction) => {
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
                                  <div className="flex justify-end gap-1">
                                    {transaction.type !== "transfer" ? (
                                      <EditTransactionButton
                                        transaction={{
                                          id: transaction.id,
                                          description: transaction.description,
                                          amountMinor: transaction.amountMinor,
                                          currency: transaction.currency ?? DEFAULT_CURRENCY,
                                          occurredAt: transaction.occurredAt,
                                          accountId: transaction.accountId,
                                          type: transaction.type,
                                          categorySlug: transaction.categorySlug,
                                          subcategorySlug: transaction.subcategorySlug,
                                        }}
                                        accounts={receiptAccountOptions}
                                      />
                                    ) : null}
                                    <DeleteTransactionButton
                                      transactionId={transaction.id}
                                      description={transaction.description}
                                    />
                                  </div>
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
      <Card>
        <CardHeader>
          <CardTitle>{t("transactions.receipts.title")}</CardTitle>
          <CardDescription>{t("transactions.receipts.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadReceiptForm accounts={receiptAccountOptions} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("transactions.receipts.recent.title")}</CardTitle>
          <CardDescription>{t("transactions.receipts.recent.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("transactions.receipts.recent.empty")}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="hidden min-w-full divide-y divide-border text-sm md:table">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.status")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.merchant")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.total")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.issued")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.confidence")}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {t("transactions.receipts.table.header.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {recentReceipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td className="px-4 py-3">
                          <Badge variant={getReceiptStatusVariant(receipt.jobStatus)}>
                            {getReceiptStatusLabel(receipt.jobStatus)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{receipt.merchantName}</div>
                          {receipt.merchantAddress ? (
                            <div className="text-xs text-muted-foreground">
                              {receipt.merchantAddress}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatCurrency(receipt.totalMinor, receipt.currency ?? DEFAULT_CURRENCY)}
                          {receipt.warnings.length > 0 ? (
                            <Badge variant="outline" className="ml-2">
                              {t("transactions.receipts.warnings", {
                                count: receipt.warnings.length,
                              })}
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {receipt.purchaseAt
                            ? formatDate(receipt.purchaseAt)
                            : t("transactions.receipts.purchase.unknown")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatReceiptConfidence(receipt.confidence)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" disabled>
                            {t("transactions.receipts.action.add")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col gap-4 p-4 md:hidden">
                  {recentReceipts.map((receipt) => (
                    <div key={receipt.id} className="space-y-2 rounded-lg border border-border/60 p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{receipt.merchantName}</p>
                          {receipt.purchaseAt ? (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(receipt.purchaseAt)}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {t("transactions.receipts.purchase.unknown")}
                            </p>
                          )}
                        </div>
                        <Badge variant={getReceiptStatusVariant(receipt.jobStatus)}>
                          {getReceiptStatusLabel(receipt.jobStatus)}
                        </Badge>
                      </div>
                      {receipt.merchantAddress ? (
                        <p className="text-xs text-muted-foreground">{receipt.merchantAddress}</p>
                      ) : null}
                      <p className="text-base font-semibold text-foreground">
                        {formatCurrency(receipt.totalMinor, receipt.currency ?? DEFAULT_CURRENCY)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatReceiptConfidence(receipt.confidence)}
                      </p>
                      {receipt.warnings.length > 0 ? (
                        <Badge variant="outline" className="w-fit">
                          {t("transactions.receipts.warnings", {
                            count: receipt.warnings.length,
                          })}
                        </Badge>
                      ) : null}
                      <div className="pt-2">
                        <Button size="sm" variant="outline" disabled className="w-full">
                          {t("transactions.receipts.action.add")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <CreateTransactionForm
        accounts={accountOptions}
        tags={tagOptions}
        defaultOccurredAt={defaultOccurredAt}
        displayMode="floating"
      />
    </div>
  );
}
