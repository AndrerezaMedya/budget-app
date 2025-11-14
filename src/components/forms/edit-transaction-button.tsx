"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { updateTransactionAction } from "@/actions/transactions";
import { initialActionState } from "@/actions/types";
import { listPredefinedCategoriesByType } from "@/config/category-definitions";
import { DEFAULT_CURRENCY, getCurrencyDecimals } from "@/config/currencies";
import { useToast } from "@/components/providers/toast-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditTransactionAccountOption = {
  id: string;
  name: string;
  currency: string;
};

type EditableTransaction = {
  id: string;
  description: string | null;
  amountMinor: number;
  currency: string;
  occurredAt: string;
  accountId: string | null;
  type: "income" | "expense" | "transfer";
  categorySlug: string | null;
  subcategorySlug: string | null;
};

type EditTransactionButtonProps = {
  transaction: EditableTransaction;
  accounts: EditTransactionAccountOption[];
  timeZone?: string | null;
};

const SELECT_BASE_CLASSES =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function formatMinorToInput(amountMinor: number, currency: string): string {
  const code = currency ? currency.toUpperCase() : DEFAULT_CURRENCY;
  const decimals = getCurrencyDecimals(code);
  const divisor = Math.pow(10, decimals);
  const majorValue = amountMinor / divisor;

  if (decimals === 0) {
    return Math.round(majorValue).toString();
  }

  const fixed = majorValue.toFixed(decimals);
  const trimmed = fixed.replace(/\.0+$/, "").replace(/\.(\d*?)0+$/, (_, digits: string) => (digits.length > 0 ? `.${digits}` : ""));
  return trimmed.length > 0 ? trimmed : "0";
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

function toLocalInputValue(iso: string, timeZone: string): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return formatDateTimeLocalInput(date, timeZone);
}

export function EditTransactionButton({ transaction, accounts, timeZone }: EditTransactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const defaultAccountId = useMemo(
    () => transaction.accountId ?? accounts[0]?.id ?? "",
    [transaction.accountId, accounts],
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId);
  const [incomeCategorySlug, setIncomeCategorySlug] = useState<string>(transaction.categorySlug ?? "");
  const [expenseParentSlug, setExpenseParentSlug] = useState<string>(transaction.categorySlug ?? "");
  const [expenseChildSlug, setExpenseChildSlug] = useState<string>(transaction.subcategorySlug ?? "");
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(updateTransactionAction, initialActionState);
  const statusRef = useRef(state.status);
  const hasAccounts = accounts.length > 0;
  const isExpense = transaction.type === "expense";
  const isIncome = transaction.type === "income";

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

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: "Transaksi diperbarui",
        description: state.message,
        variant: "success",
      });
      const frame = requestAnimationFrame(() => {
        formRef.current?.reset();
        setIsOpen(false);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (state.status === "error") {
      toast({
        title: "Gagal menyimpan",
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast]);

  const resolvedAccount = selectedAccountId ? accountMap.get(selectedAccountId) ?? null : null;
  const effectiveCurrency = (resolvedAccount?.currency ?? transaction.currency ?? DEFAULT_CURRENCY).toUpperCase();
  const amountDefault = formatMinorToInput(transaction.amountMinor, effectiveCurrency);
  const effectiveTimeZone = useMemo(() => {
    const incoming = timeZone && typeof timeZone === "string" ? timeZone.trim() : "";
    if (incoming.length > 0) {
      return incoming;
    }
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return browserTimeZone ?? "UTC";
  }, [timeZone]);

  const occurredAtDefault = toLocalInputValue(transaction.occurredAt, effectiveTimeZone);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label="Edit transaksi"
        onClick={() => {
          setSelectedAccountId(defaultAccountId);
          if (isExpense) {
            setExpenseParentSlug(transaction.categorySlug ?? "");
            setExpenseChildSlug(transaction.subcategorySlug ?? "");
          } else {
            setExpenseParentSlug("");
            setExpenseChildSlug("");
          }
          if (isIncome) {
            setIncomeCategorySlug(transaction.categorySlug ?? "");
          } else {
            setIncomeCategorySlug("");
          }
          setIsOpen(true);
        }}
        disabled={!hasAccounts}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-lg border border-border/60 bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <p className="text-sm font-semibold">Edit transaksi</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  formRef.current?.reset();
                  setIsOpen(false);
                }}
                disabled={isPending}
              >
                Tutup
              </Button>
            </div>
            <form ref={formRef} action={formAction} className="space-y-4 px-4 py-4">
              <input type="hidden" name="transactionId" value={transaction.id} />
              <input type="hidden" name="timeZone" value={effectiveTimeZone} />
              <div className="space-y-2">
                <Label htmlFor={`edit-transaction-account-${transaction.id}`}>Akun</Label>
                <select
                  id={`edit-transaction-account-${transaction.id}`}
                  name="accountId"
                  className={SELECT_BASE_CLASSES}
                  value={selectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Pilih akun
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Jumlah akan disimpan sebagai {effectiveCurrency}.
                </p>
              </div>

              {isExpense ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-transaction-expense-category-${transaction.id}`}>
                      {t("transactions.field.expenseCategory")}
                    </Label>
                    <select
                      id={`edit-transaction-expense-category-${transaction.id}`}
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
                      <option value="">
                        {t("transactions.field.uncategorized")}
                      </option>
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
                    <Label htmlFor={`edit-transaction-expense-subcategory-${transaction.id}`}>
                      {t("transactions.field.expenseSubcategory")}
                    </Label>
                    <select
                      id={`edit-transaction-expense-subcategory-${transaction.id}`}
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

              {isIncome ? (
                <div className="space-y-2">
                  <Label htmlFor={`edit-transaction-income-category-${transaction.id}`}>
                    {t("transactions.field.incomeCategory")}
                  </Label>
                  <select
                    id={`edit-transaction-income-category-${transaction.id}`}
                    name="incomeCategorySlug"
                    className={SELECT_BASE_CLASSES}
                    value={incomeCategorySlug}
                    onChange={(event) => setIncomeCategorySlug(event.target.value)}
                  >
                    <option value="">
                      {t("transactions.field.uncategorized")}
                    </option>
                    {incomeCategoryOptions.map((option) => (
                      <option key={option.slug} value={option.slug}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor={`edit-transaction-amount-${transaction.id}`}>
                  Jumlah ({effectiveCurrency})
                </Label>
                <Input
                  id={`edit-transaction-amount-${transaction.id}`}
                  name="amount"
                  inputMode="decimal"
                  defaultValue={amountDefault}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`edit-transaction-occurred-${transaction.id}`}>Tanggal & waktu</Label>
                <Input
                  id={`edit-transaction-occurred-${transaction.id}`}
                  type="datetime-local"
                  name="occurredAt"
                  defaultValue={occurredAtDefault}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`edit-transaction-description-${transaction.id}`}>Deskripsi</Label>
                <Input
                  id={`edit-transaction-description-${transaction.id}`}
                  name="description"
                  defaultValue={transaction.description ?? ""}
                  placeholder="Nama transaksi"
                />
              </div>

              {state.status === "error" ? (
                <p className="text-xs text-destructive">{state.message}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    formRef.current?.reset();
                    setIsOpen(false);
                  }}
                  disabled={isPending}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  Simpan perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
