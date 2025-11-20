"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SELECT_BASE_CLASSES =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

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
  query?: string;
};

export type FilterMessages = {
  title: string;
  type: string;
  account: string;
  category: string;
  categoryPlaceholder: string;
  categorySelectType: string;
  categoryTransferDisabled: string;
  subcategory: string;
  subcategoryPlaceholder: string;
  subcategorySelectCategory: string;
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
  query: string;
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
  query: "",
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
    query: filters.query ?? "",
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

  const ensureFiltersParamCleared = (params: URLSearchParams) => {
    if (params.has("filters")) {
      params.delete("filters");
    }
  };

  const updateQueryParams = (nextFilters: FormState) => {
    const params = new URLSearchParams(searchParams.toString());

    const setParam = (key: string, value: string | undefined) => {
      const trimmed = value?.trim();
      if (trimmed) {
        params.set(key, trimmed);
      } else {
        params.delete(key);
      }
    };

    ensureFiltersParamCleared(params);

    setParam("type", nextFilters.type || undefined);
    setParam("accountId", nextFilters.accountId);

    if (nextFilters.type === "transfer") {
      params.delete("category");
    } else if (nextFilters.categoryParentSlug) {
      const combinedCategory = nextFilters.categoryChildSlug
        ? `${nextFilters.categoryParentSlug}/${nextFilters.categoryChildSlug}`
        : nextFilters.categoryParentSlug;
      params.set("category", combinedCategory);
    } else {
      params.delete("category");
    }

    const normalizedCurrency = nextFilters.currency.trim().toUpperCase();
    setParam("currency", normalizedCurrency || undefined);

    setParam("minAmount", nextFilters.minAmount);
    setParam("maxAmount", nextFilters.maxAmount);
    setParam("startDate", nextFilters.startDate);
    setParam("endDate", nextFilters.endDate);
    setParam("query", nextFilters.query);

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (searchParams?.get("filters") !== "open" || open) {
      return;
    }

    startTransition(() => {
      setState(resolveInitialFormState(initialFilters, categories));
      setOpen(true);
    });

    const params = new URLSearchParams(searchParams.toString());
    ensureFiltersParamCleared(params);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [categories, initialFilters, open, pathname, router, searchParams, startTransition]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setState(resolveInitialFormState(initialFilters, categories));
    }
    setOpen(nextOpen);
  };

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

  const triggerVariant: "ghost" | "secondary" = hasActiveFilters ? "secondary" : "ghost";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" type="button" aria-pressed={open} className="h-auto min-h-9 whitespace-normal text-left py-2">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {messages.title}
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <Button size="sm" variant="ghost" type="button">
              {messages.close}
            </Button>
          </DialogClose>
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
                      {!state.categoryParentSlug
                        ? messages.subcategorySelectCategory
                        : subcategoryOptions.length > 0
                          ? messages.subcategoryPlaceholder
                          : messages.none}
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

          <div className="grid gap-4 sm:grid-cols-2">
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
                {currencyOptions.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="filter-min-amount">{messages.amountMin}</Label>
                <Input
                  id="filter-min-amount"
                  inputMode="decimal"
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
                <Label htmlFor="filter-max-amount">{messages.amountMax}</Label>
                <Input
                  id="filter-max-amount"
                  inputMode="decimal"
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
          </div>

          <p className="text-xs text-muted-foreground">{messages.amountHelp}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="filter-start-date">{messages.dateStart}</Label>
              <Input
                id="filter-start-date"
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
              <Label htmlFor="filter-end-date">{messages.dateEnd}</Label>
              <Input
                id="filter-end-date"
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={handleReset} disabled={isPending}>
              {messages.reset}
            </Button>
            <Button type="submit" disabled={isPending}>
              {messages.apply}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
