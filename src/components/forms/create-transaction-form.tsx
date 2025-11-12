"use client";

import Link from "next/link";
import { Plus, Scan, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { createTransactionAction } from "@/actions/transactions";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionTagInput } from "@/components/forms/transaction-tag-input";
import { useI18n } from "@/components/providers/i18n-provider";
import { listPredefinedCategoriesByType } from "@/config/category-definitions";
import { DEFAULT_CURRENCY } from "@/config/currencies";
import { formatCurrency } from "@/lib/format";
import type { Database } from "@/types/supabase";

interface AccountOption {
  id: string;
  name: string;
  currency: string | null;
  currentBalanceMinor: number;
}

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

type TransactionType = Database["public"]["Enums"]["transaction_type"];

interface CreateTransactionFormProps {
  accounts: AccountOption[];
  tags: TagOption[];
  defaultOccurredAt: string;
  displayMode?: "inline" | "floating";
}

const TYPE_OPTIONS: Array<{ value: TransactionType; labelKey: "transactions.type.expense" | "transactions.type.income" | "transactions.type.transfer" }> = [
  { value: "expense", labelKey: "transactions.type.expense" },
  { value: "income", labelKey: "transactions.type.income" },
  { value: "transfer", labelKey: "transactions.type.transfer" },
];

const SELECT_BASE_CLASSES =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CreateTransactionForm({ accounts, tags, defaultOccurredAt, displayMode = "inline" }: CreateTransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [incomeCategorySlug, setIncomeCategorySlug] = useState<string>("");
  const [expenseParentSlug, setExpenseParentSlug] = useState<string>("");
  const [expenseChildSlug, setExpenseChildSlug] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [transferFromId, setTransferFromId] = useState<string>("");
  const [transferToId, setTransferToId] = useState<string>("");
  const [state, formAction] = useActionState(createTransactionAction, initialActionState);
  const { toast } = useToast();
  const statusRef = useRef(state.status);
  const [tagResetKey, setTagResetKey] = useState(0);
  const { t } = useI18n();
  const [timezoneOffsetMinutes, setTimezoneOffsetMinutes] = useState("0");

  useEffect(() => {
    setTimezoneOffsetMinutes(String(new Date().getTimezoneOffset()));
  }, []);

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: t("transactions.toast.create.success.title"),
        description: state.message,
        variant: "success",
      });

      const frame = requestAnimationFrame(() => {
        formRef.current?.reset();
        setTransactionType("expense");
        setIncomeCategorySlug("");
        setExpenseParentSlug("");
        setExpenseChildSlug("");
        setSelectedAccountId("");
        setTransferFromId("");
        setTransferToId("");
        setIsOpen(false);
        setTagResetKey((value) => value + 1);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (state.status === "error") {
      toast({
        title: t("transactions.toast.create.error.title"),
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast, t]);

  const toggle = () => {
    setIsOpen((prev) => {
      if (prev) {
        formRef.current?.reset();
        setTransactionType("expense");
        setIncomeCategorySlug("");
        setExpenseParentSlug("");
        setExpenseChildSlug("");
        setSelectedAccountId("");
        setTransferFromId("");
        setTransferToId("");
        setTagResetKey((value) => value + 1);
      }
      return !prev;
    });
  };
  const hasAccounts = accounts.length > 0;

  const containerClasses =
    displayMode === "floating"
      ? "fixed bottom-4 left-4 right-4 z-50 flex w-full max-w-sm flex-col items-end gap-3 sm:bottom-6 sm:left-auto sm:right-6"
      : "flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end";

  const triggerClassName =
    displayMode === "floating"
      ? `h-14 w-14 rounded-full shadow-lg ${isOpen ? "bg-secondary text-secondary-foreground" : ""}`
      : "inline-flex items-center gap-2 sm:w-auto";

  const triggerSize = displayMode === "floating" ? "icon" : "sm";

  const formClasses =
    displayMode === "floating"
      ? "w-full space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-xl max-h-[calc(100vh-7rem)]"
      : "w-full max-w-full space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-w-[26rem]";

  const decoratedAccountOptions = useMemo(
    () =>
      accounts.map((account) => {
        const currency = (account.currency ?? DEFAULT_CURRENCY).toUpperCase();
        const balanceLabel = formatCurrency(account.currentBalanceMinor, currency);
        return {
          ...account,
          currency,
          label: `${account.name} — ${balanceLabel} (${currency})`,
        };
      }),
    [accounts],
  );

  const accountMap = useMemo(
    () => new Map(decoratedAccountOptions.map((account) => [account.id, account])),
    [decoratedAccountOptions],
  );

  const selectedAccount = selectedAccountId ? accountMap.get(selectedAccountId) ?? null : null;
  const transferFromAccount = transferFromId ? accountMap.get(transferFromId) ?? null : null;
  const transferToAccount = transferToId ? accountMap.get(transferToId) ?? null : null;

  const incomeCategoryOptions = useMemo(() => {
    const translateKey = (key: string | null, fallback: string) =>
      key ? t(key as Parameters<typeof t>[0]) : fallback;

    return listPredefinedCategoriesByType("income").map((category) => ({
      slug: category.slug,
      label: translateKey(category.nameKey, category.name),
    }));
  }, [t]);

  const expenseCategoryStructure = useMemo(() => {
    const translateKey = (key: string | null, fallback: string) =>
      key ? t(key as Parameters<typeof t>[0]) : fallback;

    const catalog = listPredefinedCategoriesByType("expense").map((category) => ({
      slug: category.slug,
      label: translateKey(category.nameKey, category.name),
      children: (category.subcategories ?? []).map((subcategory) => ({
        slug: subcategory.slug,
        label: translateKey(subcategory.nameKey, subcategory.name),
      })),
    }));

    const children = new Map<string, Array<{ slug: string; label: string }>>();

    catalog.forEach((category) => {
      children.set(category.slug, category.children);
    });

    const parents = catalog.map(({ slug, label }) => ({ slug, label }));

    return { parents, children };
  }, [t]);

  const currentExpenseChildren = useMemo(() => {
    if (!expenseParentSlug) {
      return [] as Array<{ slug: string; label: string }>;
    }
    return expenseCategoryStructure.children.get(expenseParentSlug) ?? [];
  }, [expenseCategoryStructure, expenseParentSlug]);

  const tagOptions = useMemo(() => tags, [tags]);

  return (
    <div className={containerClasses}>
      <Button
        type="button"
        onClick={toggle}
        className={triggerClassName}
        variant={isOpen ? "secondary" : "default"}
        size={triggerSize}
        disabled={!hasAccounts}
      >
        {displayMode === "floating" ? (
          <>
            {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            <span className="sr-only">
              {isOpen ? t("transactions.toggle.close") : t("transactions.toggle.open")}
            </span>
          </>
        ) : isOpen ? (
          t("transactions.toggle.close")
        ) : (
          t("transactions.toggle.open")
        )}
      </Button>

      {!hasAccounts ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t("transactions.noAccounts")}
        </p>
      ) : null}

      {isOpen && hasAccounts ? (
        <form
          ref={formRef}
          action={formAction}
          className={formClasses}
        >
          <input type="hidden" name="timezoneOffset" value={timezoneOffsetMinutes} />
          <Button asChild variant="outline" size="sm" className="w-full justify-center">
            <Link href="/app/receipts">
              <Scan className="mr-2 h-4 w-4" />
              {t("transactions.form.scanReceipt")}
            </Link>
          </Button>

          <div className="space-y-2">
            <Label htmlFor="transaction-type">{t("transactions.field.type")}</Label>
            <select
              id="transaction-type"
              name="type"
              className={SELECT_BASE_CLASSES}
              value={transactionType}
              onChange={(event) => {
                const nextType = event.target.value as TransactionType;
                setTransactionType(nextType);
                setIncomeCategorySlug("");
                setExpenseParentSlug("");
                setExpenseChildSlug("");
                setSelectedAccountId("");
                setTransferFromId("");
                setTransferToId("");
              }}
              required
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {transactionType === "transfer" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-account">{t("transactions.field.fromAccount")}</Label>
                <select
                  id="from-account"
                  name="fromAccountId"
                  className={SELECT_BASE_CLASSES}
                  value={transferFromId}
                  onChange={(event) => {
                    const nextFrom = event.target.value;
                    setTransferFromId(nextFrom);
                    if (nextFrom && nextFrom === transferToId) {
                      setTransferToId("");
                    }
                  }}
                  required
                >
                  <option value="" disabled>
                    {t("transactions.field.selectSource")}
                  </option>
                  {decoratedAccountOptions
                    .filter((account) => account.id !== transferToId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {transferFromAccount
                    ? t("transactions.transfer.fromBalance", {
                      balance: formatCurrency(
                        transferFromAccount.currentBalanceMinor,
                        transferFromAccount.currency ?? DEFAULT_CURRENCY,
                      ),
                    })
                    : t("transactions.transfer.balance.placeholder")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-account">{t("transactions.field.toAccount")}</Label>
                <select
                  id="to-account"
                  name="toAccountId"
                  className={SELECT_BASE_CLASSES}
                  value={transferToId}
                  onChange={(event) => {
                    const nextTo = event.target.value;
                    if (nextTo && nextTo === transferFromId) {
                      setTransferToId("");
                      return;
                    }
                    setTransferToId(nextTo);
                  }}
                  required
                >
                  <option value="" disabled>
                    {t("transactions.field.selectDestination")}
                  </option>
                  {decoratedAccountOptions
                    .filter((account) => account.id !== transferFromId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {transferToAccount
                    ? t("transactions.transfer.toBalance", {
                      balance: formatCurrency(
                        transferToAccount.currentBalanceMinor,
                        transferToAccount.currency ?? DEFAULT_CURRENCY,
                      ),
                    })
                    : t("transactions.transfer.balance.placeholder")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="transaction-account">{t("transactions.field.account")}</Label>
              <select
                id="transaction-account"
                name="accountId"
                className={SELECT_BASE_CLASSES}
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                required
              >
                <option value="" disabled>
                  {t("transactions.field.selectAccount")}
                </option>
                {decoratedAccountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {selectedAccount
                  ? t("transactions.account.balance", {
                    balance: formatCurrency(
                      selectedAccount.currentBalanceMinor,
                      selectedAccount.currency ?? DEFAULT_CURRENCY,
                    ),
                  })
                  : t("transactions.account.balance.placeholder")}
              </p>
            </div>
          )}

          {transactionType === "expense" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="transaction-expense-category">
                  {t("transactions.field.expenseCategory")}
                </Label>
                <select
                  id="transaction-expense-category"
                  name="expenseCategorySlug"
                  className={SELECT_BASE_CLASSES}
                  value={expenseParentSlug}
                  onChange={(event) => {
                    const nextParent = event.target.value;
                    setExpenseParentSlug(nextParent);
                    if (!nextParent) {
                      setExpenseChildSlug("");
                      return;
                    }
                    const children = expenseCategoryStructure.children.get(nextParent) ?? [];
                    const generalChild = children.find((child) => child.slug === "general");
                    setExpenseChildSlug(generalChild ? generalChild.slug : "");
                  }}
                >
                  <option value="">{t("transactions.field.uncategorized")}</option>
                  {expenseCategoryStructure.parents.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t("transactions.field.expenseCategory.help")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction-expense-subcategory">
                  {t("transactions.field.expenseSubcategory")}
                </Label>
                <select
                  id="transaction-expense-subcategory"
                  name="expenseSubcategorySlug"
                  className={SELECT_BASE_CLASSES}
                  value={expenseChildSlug}
                  onChange={(event) => setExpenseChildSlug(event.target.value)}
                  disabled={!expenseParentSlug || currentExpenseChildren.length === 0}
                >
                  <option value="" disabled>
                    {expenseParentSlug
                      ? currentExpenseChildren.length > 0
                        ? t("transactions.field.expenseSubcategory.choose")
                        : t("transactions.field.expenseSubcategory.none")
                      : t("transactions.field.expenseSubcategory.selectCategory")}
                  </option>
                  {currentExpenseChildren.map((child) => (
                    <option key={child.slug} value={child.slug}>
                      {child.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t("transactions.field.expenseSubcategory.help")}
                </p>
              </div>
            </>
          ) : null}

          {transactionType === "income" ? (
            <div className="space-y-2">
              <Label htmlFor="transaction-income-category">
                {t("transactions.field.incomeCategory")}
              </Label>
              <select
                id="transaction-income-category"
                name="incomeCategorySlug"
                className={SELECT_BASE_CLASSES}
                value={incomeCategorySlug}
                onChange={(event) => setIncomeCategorySlug(event.target.value)}
              >
                <option value="">{t("transactions.field.uncategorized")}</option>
                {incomeCategoryOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="transaction-amount">{t("transactions.field.amount")}</Label>
            <Input
              id="transaction-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("transactions.field.amount.tip")}
            </p>
          </div>

          {transactionType === "transfer" ? (
            <div className="space-y-2">
              <Label htmlFor="transaction-admin-fee">{t("transactions.field.adminFee")}</Label>
              <Input
                id="transaction-admin-fee"
                name="adminFee"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                {t("transactions.field.adminFee.help")}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="transaction-occurred">{t("transactions.field.occurredAt")}</Label>
            <Input
              id="transaction-occurred"
              name="occurredAt"
              type="datetime-local"
              defaultValue={defaultOccurredAt}
              required
            />
          </div>

          {transactionType !== "transfer" ? (
            <div className="space-y-2">
              <Label htmlFor="transaction-tags">{t("transactions.field.tags")}</Label>
              <TransactionTagInput key={tagResetKey} name="tagIds" options={tagOptions} />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="transaction-description">{t("transactions.field.description")}</Label>
            <Input
              id="transaction-description"
              name="description"
              placeholder={t("transactions.field.description.placeholder")}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={toggle}>
              {t("transactions.toggle.close")}
            </Button>
            <Button type="submit">{t("transactions.save")}</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
