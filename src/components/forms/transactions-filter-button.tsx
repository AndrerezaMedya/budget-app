"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_BASE_CLASSES =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const OVERLAY_CLASSES =
  "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 py-6 sm:px-6";

const PANEL_CLASSES =
  "w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-6 shadow-xl";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

type CategoryOption = {
  type: "expense" | "income";
  slug: string;
  label: string;
  children: Array<{ slug: string; label: string }>;
};

type AccountOption = {
  id: string;
  label: string;
};

type CurrencyOption = {
  value: string;
  label: string;
};

type TypeOption = {
  value: TransactionType;
  label: string;
};

export type TransactionFilterValues = {
  type?: TransactionType;
  accountId?: string;
  categoryParentSlug?: string;
  categoryChildSlug?: string;
  currency?: string;
  minAmount?: string;
  maxAmount?: string;
  startDate?: string;
  endDate?: string;
};

export type FilterMessages = {
  title: string;
  type: string;
  account: string;
  category: string;
  subcategory: string;
  currency: string;
  currencyPlaceholder: string;
  amountMin: string;
  amountMax: string;
  amountHelp: string;
  dateStart: string;
  dateEnd: string;
  apply: string;
  reset: string;
  close: string;
  none: string;
  categoryPlaceholder: string;
  subcategoryPlaceholder: string;
  categorySelectType: string;
  subcategorySelectCategory: string;
  categoryTransferDisabled: string;
};

type FormState = {
  type: TransactionType | "";
  accountId: string;
  categoryParentSlug: string;
  categoryChildSlug: string;
  currency: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM_STATE: FormState = {
  type: "",
  accountId: "",
  categoryParentSlug: "",
  categoryChildSlug: "",
  currency: "",
  minAmount: "",
  maxAmount: "",
  startDate: "",
  endDate: "",
};

function resolveInitialFormState(
  filters: TransactionFilterValues,
  categories: CategoryOption[],
): FormState {
  const base: FormState = {
    ...EMPTY_FORM_STATE,
    accountId: filters.accountId ?? "",
    currency: filters.currency ?? "",
    minAmount: filters.minAmount ?? "",
    maxAmount: filters.maxAmount ?? "",
    startDate: filters.startDate ?? "",
    endDate: filters.endDate ?? "",
  };

  const inferredType: TransactionType | "" = (() => {
    if (filters.type) {
      return filters.type;
    }
    if (filters.categoryParentSlug) {
      const matched = categories.find((category) => category.slug === filters.categoryParentSlug);
      return matched?.type ?? "";
    }
    return "";
  })();

  base.type = inferredType;

  if (inferredType !== "expense" && inferredType !== "income") {
    return base;
  }

  const typedCategories = categories.filter((category) => category.type === inferredType);
  const selectedCategory = typedCategories.find((category) => category.slug === filters.categoryParentSlug);

  if (selectedCategory) {
    base.categoryParentSlug = selectedCategory.slug;
    if (filters.categoryChildSlug) {
      const selectedSubcategory = selectedCategory.children.find(
        (child) => child.slug === filters.categoryChildSlug,
      );
      if (selectedSubcategory) {
        base.categoryChildSlug = selectedSubcategory.slug;
      }
    }
  }

  return base;
}

interface TransactionsFilterButtonProps {
  triggerLabel: string;
  hasActiveFilters: boolean;
  accounts: AccountOption[];
  categories: CategoryOption[];
  currencyOptions: CurrencyOption[];
  typeOptions: TypeOption[];
  initialFilters: TransactionFilterValues;
  messages: FilterMessages;
}

export function TransactionsFilterButton({
  triggerLabel,
  hasActiveFilters,
  accounts,
  categories,
  currencyOptions,
  typeOptions,
  initialFilters,
  messages,
}: TransactionsFilterButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<FormState>(() => resolveInitialFormState(initialFilters, categories));

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const filteredCategories = useMemo(() => {
    if (state.type !== "expense" && state.type !== "income") {
      return [] as CategoryOption[];
    }
    return categories.filter((category) => category.type === state.type);
  }, [categories, state.type]);

  const selectedCategory = useMemo(
    () => filteredCategories.find((category) => category.slug === state.categoryParentSlug) ?? null,
    [filteredCategories, state.categoryParentSlug],
  );

  const subcategoryOptions = selectedCategory?.children ?? [];
  const isTransferType = state.type === "transfer";
  const shouldDisableCategory = state.type !== "expense" && state.type !== "income";

  const updateQueryParams = (nextState: FormState) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    const setParam = (key: string, value: string) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    };

    setParam("type", nextState.type);
    setParam("accountId", nextState.accountId);
    setParam("currency", nextState.currency);
    setParam("minAmount", nextState.minAmount);
    setParam("maxAmount", nextState.maxAmount);
    setParam("startDate", nextState.startDate);
    setParam("endDate", nextState.endDate);

    const categoryValue = nextState.categoryParentSlug
      ? nextState.categoryChildSlug
        ? `${nextState.categoryParentSlug}/${nextState.categoryChildSlug}`
        : nextState.categoryParentSlug
      : "";
    setParam("category", categoryValue);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateQueryParams(state);
    setOpen(false);
  };

  const handleReset = () => {
    const cleared: FormState = { ...EMPTY_FORM_STATE };
    setState(cleared);
    updateQueryParams(cleared);
    setOpen(false);
  };

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setState(resolveInitialFormState(initialFilters, categories));
    setOpen(true);
  };

  const triggerVariant: "ghost" | "secondary" = hasActiveFilters ? "secondary" : "ghost";

  return (
    <>
      <Button
        variant={triggerVariant}
        size="sm"
        type="button"
        onClick={handleToggle}
        aria-pressed={open}
      >
        {triggerLabel}
      </Button>
      {open ? (
        <div className={OVERLAY_CLASSES} role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div
            className={PANEL_CLASSES}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{messages.title}</h2>
              </div>
              <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
                {messages.close}
              </Button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="filter-type">{messages.type}</Label>
                  <select
                    id="filter-type"
                    className={SELECT_BASE_CLASSES}
                    value={state.type}
                    onChange={(event) => {
                      const nextType = event.target.value as TransactionType | "";
                      setState((prev) => ({
                        ...prev,
                        type: nextType,
                        categoryParentSlug: "",
                        categoryChildSlug: "",
                      }));
                    }}
                  >
                    <option value="">{messages.none}</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-account">{messages.account}</Label>
                  <select
                    id="filter-account"
                    className={SELECT_BASE_CLASSES}
                    value={state.accountId}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        accountId: event.target.value,
                      }))
                    }
                  >
                    <option value="">{messages.none}</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {isTransferType ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{messages.category}</Label>
                    <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      {messages.categoryTransferDisabled}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="filter-category">{messages.category}</Label>
                      <select
                        id="filter-category"
                        className={SELECT_BASE_CLASSES}
                        value={state.categoryParentSlug}
                        onChange={(event) =>
                          setState((prev) => ({
                            ...prev,
                            categoryParentSlug: event.target.value,
                            categoryChildSlug: "",
                          }))
                        }
                        disabled={shouldDisableCategory}
                      >
                        <option value="">
                          {shouldDisableCategory
                            ? messages.categorySelectType
                            : filteredCategories.length > 0
                              ? messages.categoryPlaceholder
                              : messages.none}
                        </option>
                        {filteredCategories.map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-subcategory">{messages.subcategory}</Label>
                      <select
                        id="filter-subcategory"
                        className={SELECT_BASE_CLASSES}
                        value={state.categoryChildSlug}
                        onChange={(event) =>
                          setState((prev) => ({
                            ...prev,
                            categoryChildSlug: event.target.value,
                          }))
                        }
                        disabled={
                          shouldDisableCategory ||
                          !state.categoryParentSlug ||
                          subcategoryOptions.length === 0
                        }
                      >
                        <option value="">
                          {shouldDisableCategory
                            ? messages.categorySelectType
                            : state.categoryParentSlug
                              ? subcategoryOptions.length > 0
                                ? messages.subcategoryPlaceholder
                                : messages.none
                              : messages.subcategorySelectCategory}
                        </option>
                        {subcategoryOptions.map((subcategory) => (
                          <option key={subcategory.slug} value={subcategory.slug}>
                            {subcategory.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="filter-currency">{messages.currency}</Label>
                  <select
                    id="filter-currency"
                    className={SELECT_BASE_CLASSES}
                    value={state.currency}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        currency: event.target.value,
                      }))
                    }
                  >
                    <option value="">{messages.currencyPlaceholder}</option>
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-min">{messages.amountMin}</Label>
                  <Input
                    id="filter-min"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={state.minAmount}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        minAmount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-max">{messages.amountMax}</Label>
                  <Input
                    id="filter-max"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={state.maxAmount}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        maxAmount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{messages.amountHelp}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="filter-start">{messages.dateStart}</Label>
                  <Input
                    id="filter-start"
                    type="date"
                    value={state.startDate}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-end">{messages.dateEnd}</Label>
                  <Input
                    id="filter-end"
                    type="date"
                    value={state.endDate}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleReset} disabled={isPending}>
                  {messages.reset}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {messages.apply}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
