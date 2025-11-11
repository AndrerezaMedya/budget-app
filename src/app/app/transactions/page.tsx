import { Fragment, type ReactNode } from "react";

import { ACCOUNT_CURRENCY_OPTIONS, DEFAULT_CURRENCY, getCurrencyDecimals } from "@/config/currencies";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCurrentPeriodKey, getPeriodRange } from "@/lib/period";
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
import { TransactionsFilterChips } from "@/components/forms/transactions-filter-chips";
import {
  TransactionsFilterPresets,
  type TransactionsPresetOption,
} from "@/components/forms/transactions-filter-presets";
import { TransactionsSearchInput } from "@/components/forms/transactions-search-input";
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
  const query = getParamValue(searchParams, "query")?.trim() || undefined;

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
    query,
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

function toIsoStartOfDay(dateString: string | undefined): string | null {
  if (!dateString) {
    return null;
  }
  const timestamp = Date.parse(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function toIsoStartOfNextDay(dateString: string | undefined): string | null {
  if (!dateString) {
    return null;
  }
  const timestamp = Date.parse(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  const nextDay = new Date(timestamp);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString();
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

function resolveAmountToneClass(value: number) {
  if (value > 0) {
    return "text-emerald-500";
  }
  if (value < 0) {
    return "text-destructive";
  }
  return "text-muted-foreground";
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
  const { t, locale } = await getTranslator();
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const defaultPeriodKey = getCurrentPeriodKey();
  const requestedPeriodKey = getParamValue(resolvedSearchParams, "period") ?? defaultPeriodKey;
  const resolvedPeriodKey = requestedPeriodKey ?? defaultPeriodKey;
  let periodRange = getPeriodRange(requestedPeriodKey);

  if (!periodRange) {
    periodRange = getPeriodRange(defaultPeriodKey);
  }

  if (!periodRange) {
    throw new Error("Unable to determine period range for transactions");
  }

  const { periodStart, periodEnd } = periodRange;
  const defaultStartDate = periodStart.toISOString().slice(0, 10);
  const inclusivePeriodEnd = new Date(periodEnd);
  inclusivePeriodEnd.setUTCDate(inclusivePeriodEnd.getUTCDate() - 1);
  const defaultEndDate = inclusivePeriodEnd.toISOString().slice(0, 10);

  const filters = parseFilters(resolvedSearchParams);
  const effectiveStartDate = filters.startDate ?? defaultStartDate;
  const effectiveEndDate = filters.endDate ?? defaultEndDate;

  const fetchStartIso = toIsoStartOfDay(filters.startDate) ?? periodStart.toISOString();
  const fetchEndIso = toIsoStartOfNextDay(filters.endDate) ?? periodEnd.toISOString();

  const [{ accounts }, tags, recentTransactions, profile, recentReceipts] = await Promise.all([
    fetchAccounts(),
    fetchTags(),
    fetchRecentTransactions({
      limit: 25,
      startDate: fetchStartIso,
      endDate: fetchEndIso,
    }),
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

  const typeLabelMap: Record<TransactionType, string> = {
    expense: t("transactions.type.expense"),
    income: t("transactions.type.income"),
    transfer: t("transactions.type.transfer"),
  } as const;

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

  const initialFilterValues: TransactionFilterValues = {
    ...filters,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
  };

  const timeZone = profile?.timeZone ?? "Asia/Jakarta";
  const defaultOccurredAt = formatDateTimeLocalInput(new Date(), timeZone);

  const amountCurrencyCandidate = filters.currency ?? (filters.minAmount || filters.maxAmount ? DEFAULT_CURRENCY : undefined);
  const normalizedAmountCurrency = amountCurrencyCandidate ? amountCurrencyCandidate.toUpperCase() : undefined;
  const minMinor = normalizedAmountCurrency ? parseAmountToMinor(filters.minAmount, normalizedAmountCurrency) : null;
  const maxMinor = normalizedAmountCurrency ? parseAmountToMinor(filters.maxAmount, normalizedAmountCurrency) : null;

  const startTimestampRaw = effectiveStartDate
    ? Date.parse(`${effectiveStartDate}T00:00:00.000Z`)
    : Number.NaN;
  const endTimestampRaw = effectiveEndDate
    ? Date.parse(`${effectiveEndDate}T23:59:59.999Z`)
    : Number.NaN;
  const startTimestamp = Number.isNaN(startTimestampRaw) ? null : startTimestampRaw;
  const endTimestamp = Number.isNaN(endTimestampRaw) ? null : endTimestampRaw;

  const normalizedQuery = filters.query?.toLowerCase() ?? null;

  const filteredTransactions = recentTransactions.filter((transaction) => {
    const transactionCurrency = (transaction.currency ?? DEFAULT_CURRENCY).toUpperCase();
    if (normalizedQuery) {
      const haystack = [
        transaction.description ?? "",
        transaction.account?.name ?? "",
        transaction.category?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

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

  filteredTransactions.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const computeRollingStartDate = (days: number) => {
    const anchor = new Date(periodEnd);
    anchor.setUTCDate(anchor.getUTCDate() - days);
    return anchor.toISOString().slice(0, 10);
  };

  const last30StartDate = computeRollingStartDate(30);
  const last90StartDate = computeRollingStartDate(90);

  const describeRange = (start: string, end: string) =>
    `${formatDate(`${start}T00:00:00.000Z`, locale)} - ${formatDate(`${end}T00:00:00.000Z`, locale)}`;

  type PresetConfig = {
    id: string;
    label: string;
    description?: string;
    setParams?: Record<string, string>;
    clearParams?: string[];
    match?: {
      startDate: string;
      endDate: string;
    };
    isCustom?: boolean;
  };

  const presetConfigs: PresetConfig[] = [
    {
      id: "current-period",
      label: t("transactions.presets.currentPeriod"),
      description: describeRange(defaultStartDate, defaultEndDate),
      setParams: {
        period: resolvedPeriodKey,
      },
      clearParams: ["startDate", "endDate", "filters"],
      match: {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
      },
    },
    {
      id: "last-30-days",
      label: t("transactions.presets.last30Days"),
      description: describeRange(last30StartDate, defaultEndDate),
      setParams: {
        startDate: last30StartDate,
        endDate: defaultEndDate,
        period: "custom",
      },
      clearParams: ["filters"],
      match: {
        startDate: last30StartDate,
        endDate: defaultEndDate,
      },
    },
    {
      id: "last-90-days",
      label: t("transactions.presets.last90Days"),
      description: describeRange(last90StartDate, defaultEndDate),
      setParams: {
        startDate: last90StartDate,
        endDate: defaultEndDate,
        period: "custom",
      },
      clearParams: ["filters"],
      match: {
        startDate: last90StartDate,
        endDate: defaultEndDate,
      },
    },
    {
      id: "custom",
      label: t("transactions.presets.custom"),
      description: t("transactions.presets.custom.description"),
      setParams: {
        filters: "open",
      },
      clearParams: [],
      isCustom: true,
    },
  ];

  const activePresetId =
    presetConfigs.find((preset) => {
      if (!preset.match) {
        return false;
      }
      return (
        preset.match.startDate === effectiveStartDate &&
        preset.match.endDate === effectiveEndDate
      );
    })?.id ?? undefined;

  const presetOptions: TransactionsPresetOption[] = presetConfigs.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    setParams: preset.setParams,
    clearParams: preset.clearParams,
    isCustom: preset.isCustom,
  }));

  const hasActiveFilters = Boolean(
    filters.type ||
      filters.accountId ||
      filters.categoryParentSlug ||
      filters.categoryChildSlug ||
      filters.currency ||
      filters.minAmount ||
      filters.maxAmount ||
      filters.startDate ||
      filters.endDate ||
      filters.query,
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

  const activeFilterChips: Array<{ id: string; label: string; paramKeys: string[] }> = [];

  if (filters.type) {
    const typeLabel = typeOptions.find((option) => option.value === filters.type)?.label ?? filters.type;
    activeFilterChips.push({
      id: "type",
      label: t("transactions.filters.active.type", { value: typeLabel }),
      paramKeys: ["type"],
    });
  }

  if (filters.accountId) {
    const accountLabel = filterAccountOptions.find((option) => option.id === filters.accountId)?.label ?? filters.accountId;
    activeFilterChips.push({
      id: "accountId",
      label: t("transactions.filters.active.account", { value: accountLabel }),
      paramKeys: ["accountId"],
    });
  }

  if (filters.query) {
    activeFilterChips.push({
      id: "query",
      label: t("transactions.filters.active.query", { value: filters.query }),
      paramKeys: ["query"],
    });
  }

  if (filters.categoryParentSlug) {
    const parentOption = categoryFilterOptions.find((category) => category.slug === filters.categoryParentSlug);
    let categoryLabel = parentOption?.label ?? filters.categoryParentSlug;
    if (filters.categoryChildSlug && parentOption) {
      const childOption = parentOption.children.find((child) => child.slug === filters.categoryChildSlug);
      if (childOption) {
        categoryLabel = `${categoryLabel} → ${childOption.label}`;
      }
    }

    activeFilterChips.push({
      id: "category",
      label: t("transactions.filters.active.category", { value: categoryLabel }),
      paramKeys: ["category"],
    });
  }

  if (filters.currency) {
    activeFilterChips.push({
      id: "currency",
      label: t("transactions.filters.active.currency", { value: filters.currency }),
      paramKeys: ["currency"],
    });
  }

  if (filters.minAmount) {
    const valueLabel = normalizedAmountCurrency
      ? `${filters.minAmount} ${normalizedAmountCurrency}`
      : filters.minAmount;
    activeFilterChips.push({
      id: "minAmount",
      label: t("transactions.filters.active.amountMin", { value: valueLabel }),
      paramKeys: ["minAmount"],
    });
  }

  if (filters.maxAmount) {
    const valueLabel = normalizedAmountCurrency
      ? `${filters.maxAmount} ${normalizedAmountCurrency}`
      : filters.maxAmount;
    activeFilterChips.push({
      id: "maxAmount",
      label: t("transactions.filters.active.amountMax", { value: valueLabel }),
      paramKeys: ["maxAmount"],
    });
  }

  if (filters.startDate) {
    const formatted = formatDate(`${filters.startDate}T00:00:00.000Z`, locale);
    activeFilterChips.push({
      id: "startDate",
      label: t("transactions.filters.active.startDate", { value: formatted }),
      paramKeys: ["startDate"],
    });
  }

  if (filters.endDate) {
    const formatted = formatDate(`${filters.endDate}T00:00:00.000Z`, locale);
    activeFilterChips.push({
      id: "endDate",
      label: t("transactions.filters.active.endDate", { value: formatted }),
      paramKeys: ["endDate"],
    });
  }

  const activeFiltersHeading = t("transactions.filters.active.title");
  const clearAllLabel = t("transactions.filters.active.clear");
  const removeFilterLabel = t("transactions.filters.active.remove");

  const accountFilterDetails = filters.accountId
    ? accountOptions.find((option) => option.id === filters.accountId)
    : null;

  const accountCurrency = (accountFilterDetails?.currency ?? DEFAULT_CURRENCY).toUpperCase();
  const currentBalanceMinor = accountFilterDetails?.currentBalanceMinor ?? 0;
  const filteredNetChangeMinor = accountFilterDetails
    ? filteredTransactions.reduce((sum, transaction) => {
        if (transaction.accountId !== accountFilterDetails.id) {
          return sum;
        }
        return sum + deriveSignedAmount(
          transaction.amountMinor,
          transaction.type,
          transaction.transferDirection,
        );
      }, 0)
    : 0;
  const startingBalanceMinor = currentBalanceMinor - filteredNetChangeMinor;
  const hasRunningBalanceContext = Boolean(accountFilterDetails);
  const changeDescriptorKey: TranslationKey = filteredNetChangeMinor > 0
    ? "transactions.accountSummary.delta.positive"
    : filteredNetChangeMinor < 0
      ? "transactions.accountSummary.delta.negative"
      : "transactions.accountSummary.delta.neutral";

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

  const groupedTransactions = (() => {
    const groups = new Map<
      string,
      {
        dateKey: string;
        items: typeof filteredTransactions;
        totals: Map<string, number>;
      }
    >();

    for (const transaction of filteredTransactions) {
      const dateKey = transaction.occurredAt.slice(0, 10);
      let group = groups.get(dateKey);
      if (!group) {
        group = {
          dateKey,
          items: [],
          totals: new Map<string, number>(),
        };
        groups.set(dateKey, group);
      }

      group.items.push(transaction);
      const currencyKey = (transaction.currency ?? DEFAULT_CURRENCY).toUpperCase();
      const signed = deriveSignedAmount(
        transaction.amountMinor,
        transaction.type,
        transaction.transferDirection,
      );
      group.totals.set(currencyKey, (group.totals.get(currencyKey) ?? 0) + signed);
    }

    return Array.from(groups.values())
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
      .map((group) => ({
        ...group,
        label: formatDate(`${group.dateKey}T00:00:00.000Z`, locale),
      }));
  })();

  const mobileTimeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("transactions.page.heading")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("transactions.page.subheading")}
          </p>
        </div>
      </header>

      <div className="sticky top-20 z-20 space-y-3">
        <div className="rounded-3xl border border-border/70 bg-surface/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-sm">
              <TransactionsSearchInput
                initialValue={filters.query ?? ""}
                label={t("transactions.search.label")}
                placeholder={t("transactions.search.placeholder")}
                clearLabel={t("transactions.search.clear")}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" disabled>
                {t("transactions.button.import")}
              </Button>
              <TransactionsFilterPresets
                triggerLabel={t("transactions.presets.button")}
                activePresetId={activePresetId}
                presets={presetOptions}
              />
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
              <CreateTransactionForm
                accounts={accountOptions}
                tags={tagOptions}
                defaultOccurredAt={defaultOccurredAt}
              />
            </div>
          </div>
        </div>
      </div>

      <TransactionsFilterChips
        chips={activeFilterChips}
        heading={activeFiltersHeading}
        clearAllLabel={clearAllLabel}
        removeLabelTemplate={removeFilterLabel}
      />

      {hasRunningBalanceContext ? (
        <Card className="border-primary/20 bg-surface/60">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {t("transactions.accountSummary.title")}
              </CardTitle>
              <CardDescription>
                {t("transactions.accountSummary.description", {
                  account: accountFilterDetails?.name ?? "",
                })}
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              {accountCurrency}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("transactions.accountSummary.starting")}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatCurrency(startingBalanceMinor, accountCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("transactions.accountSummary.change")}
                </p>
                <p
                  className={`mt-1 text-lg font-semibold tabular-nums ${
                    filteredNetChangeMinor > 0
                      ? "text-emerald-500"
                      : filteredNetChangeMinor < 0
                        ? "text-destructive"
                        : "text-foreground"
                  }`}
                >
                  {formatCurrency(filteredNetChangeMinor, accountCurrency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(changeDescriptorKey)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("transactions.accountSummary.current")}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatCurrency(currentBalanceMinor, accountCurrency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("transactions.recent.title")}</CardTitle>
          <CardDescription>{t("transactions.recent.description")}</CardDescription>
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
                  : groupedTransactions.map((group) => {
                      const singleCurrencyTotal = group.totals.size === 1
                        ? Array.from(group.totals.entries())[0]
                        : null;

                      return (
                        <Fragment key={group.dateKey}>
                          <tr className="bg-muted/40">
                            <td
                              colSpan={TABLE_COLUMNS.length}
                              className="px-4 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {group.label}
                                </span>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span>
                                    {t("transactions.table.group.count", {
                                      count: group.items.length,
                                    })}
                                  </span>
                                  {singleCurrencyTotal ? (
                                    <span className="font-semibold text-foreground">
                                      {t("transactions.table.group.total", {
                                        amount: formatCurrency(singleCurrencyTotal[1], singleCurrencyTotal[0]),
                                      })}
                                    </span>
                                  ) : group.totals.size > 1 ? (
                                    <span>
                                      {t("transactions.table.group.mixed", {
                                        count: group.totals.size,
                                      })}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                          </tr>
                          {group.items.map((transaction) => {
                            const signedAmount = deriveSignedAmount(
                              transaction.amountMinor,
                              transaction.type,
                              transaction.transferDirection,
                            );
                            const amountDisplay = formatCurrency(signedAmount, transaction.currency ?? undefined);
                            const occurredOn = formatDate(transaction.occurredAt, locale);

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
                        </Fragment>
                      );
                    })}
              </tbody>
            </table>
            <div className="space-y-4 p-4 md:hidden">
              {filteredTransactions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? t("transactions.filters.noResults")
                    : t("transactions.table.mobile.empty")}
                </div>
              ) : (
                groupedTransactions.map((group) => {
                  const singleCurrencyTotal = group.totals.size === 1
                    ? Array.from(group.totals.entries())[0]
                    : null;

                  return (
                    <section key={group.dateKey} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {group.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("transactions.table.group.count", {
                              count: group.items.length,
                            })}
                          </p>
                        </div>
                        {singleCurrencyTotal ? (
                          <p className="text-xs font-semibold text-foreground">
                            {t("transactions.table.group.total", {
                              amount: formatCurrency(singleCurrencyTotal[1], singleCurrencyTotal[0]),
                            })}
                          </p>
                        ) : group.totals.size > 1 ? (
                          <p className="text-xs text-muted-foreground">
                            {t("transactions.table.group.mixed", {
                              count: group.totals.size,
                            })}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-3">
                        {group.items.map((transaction) => {
                          const currencyCode = (transaction.currency ?? DEFAULT_CURRENCY).toUpperCase();
                          const signedAmount = deriveSignedAmount(
                            transaction.amountMinor,
                            transaction.type,
                            transaction.transferDirection,
                          );
                          const amountDisplay = formatCurrency(signedAmount, transaction.currency ?? undefined);
                          const occurredTime = new Date(transaction.occurredAt);
                          const metadataParts: string[] = [];
                          if (transaction.account?.name) {
                            metadataParts.push(`${transaction.account.name} · ${currencyCode}`);
                          } else {
                            metadataParts.push(currencyCode);
                          }
                          if (!Number.isNaN(occurredTime.getTime())) {
                            metadataParts.push(mobileTimeFormatter.format(occurredTime));
                          }

                          return (
                            <div
                              key={transaction.id}
                              className="space-y-3 rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {transaction.description ?? typeLabelMap[transaction.type]}
                                  </p>
                                  {metadataParts.length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {metadataParts.join(" • ")}
                                    </p>
                                  ) : null}
                                  {transaction.category?.name ? (
                                    <p className="text-xs text-muted-foreground">
                                      {transaction.category.name}
                                    </p>
                                  ) : null}
                                </div>
                                <div
                                  className={`shrink-0 text-sm font-semibold tabular-nums ${resolveAmountToneClass(signedAmount)}`}
                                >
                                  {amountDisplay}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="outline" className="rounded-full px-2 py-1 text-[0.7rem] font-medium">
                                  {typeLabelMap[transaction.type]}
                                </Badge>
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              )}
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
