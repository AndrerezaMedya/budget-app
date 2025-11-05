"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import { createTransactionAction } from "@/actions/transactions";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionTagInput } from "@/components/forms/transaction-tag-input";
import type { CategoryWithParent } from "@/lib/supabase/queries/categories";
import type { Database } from "@/types/supabase";

interface AccountOption {
  id: string;
  name: string;
}

interface PayeeOption {
  id: string;
  name: string;
}

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

type TransactionType = Database["public"]["Enums"]["transaction_type"];

interface CreateTransactionFormProps {
  accounts: AccountOption[];
  categories: CategoryWithParent[];
  payees: PayeeOption[];
  tags: TagOption[];
  defaultOccurredAt: string;
}

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

export function CreateTransactionForm({
  accounts,
  categories,
  payees,
  tags,
  defaultOccurredAt,
}: CreateTransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [state, formAction] = useFormState(createTransactionAction, initialActionState);
  const { toast } = useToast();
  const statusRef = useRef(state.status);
  const [tagResetKey, setTagResetKey] = useState(0);

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: "Transaction saved",
        description: state.message,
        variant: "success",
      });

      const frame = requestAnimationFrame(() => {
        formRef.current?.reset();
        setTransactionType("expense");
        setIsOpen(false);
        setTagResetKey((value) => value + 1);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (state.status === "error") {
      toast({
        title: "Unable to save transaction",
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast]);

  const toggle = () => {
    setIsOpen((prev) => {
      if (prev) {
        formRef.current?.reset();
        setTransactionType("expense");
        setTagResetKey((value) => value + 1);
      }
      return !prev;
    });
  };
  const hasAccounts = accounts.length > 0;

  const categoryOptions = useMemo(() => {
    return categories.map((category) => {
      if (category.parentName) {
        return {
          id: category.id,
          label: `${category.parentName} • ${category.name}`,
        };
      }
      return { id: category.id, label: category.name };
    });
  }, [categories]);

  const tagOptions = useMemo(() => tags, [tags]);

  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
      <Button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 sm:w-auto"
        variant={isOpen ? "secondary" : "default"}
        size="sm"
        disabled={!hasAccounts}
      >
        {isOpen ? "Cancel" : "Add transaction"}
      </Button>

      {!hasAccounts ? (
        <p className="text-sm text-muted-foreground" role="status">
          Create an account before recording transactions.
        </p>
      ) : null}

      {isOpen && hasAccounts ? (
        <form
          ref={formRef}
          action={formAction}
          className="w-full max-w-full space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-w-[26rem]"
        >
          <div className="space-y-2">
            <Label htmlFor="transaction-type">Type</Label>
            <select
              id="transaction-type"
              name="type"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={transactionType}
              onChange={(event) =>
                setTransactionType(event.target.value as TransactionType)
              }
              required
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {transactionType === "transfer" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-account">From account</Label>
                <select
                  id="from-account"
                  name="fromAccountId"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Select source account
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-account">To account</Label>
                <select
                  id="to-account"
                  name="toAccountId"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Select destination account
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="transaction-account">Account</Label>
              <select
                id="transaction-account"
                name="accountId"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select an account
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {transactionType !== "transfer" ? (
            <div className="space-y-2">
              <Label htmlFor="transaction-category">Category</Label>
              <select
                id="transaction-category"
                name="categoryId"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">Uncategorized</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="transaction-amount">Amount</Label>
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
              Money values convert to minor units when saved.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-occurred">Occurred on</Label>
            <Input
              id="transaction-occurred"
              name="occurredAt"
              type="datetime-local"
              defaultValue={defaultOccurredAt}
              required
            />
          </div>

          {transactionType !== "transfer" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="transaction-payee">Payee</Label>
                <select
                  id="transaction-payee"
                  name="payeeId"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="">No payee</option>
                  {payees.map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                    </option>
                  ))}
                </select>
                <Input
                  id="transaction-new-payee"
                  name="newPayee"
                  placeholder="Add new payee"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  Provide a new payee name to create it on the fly.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-tags">Tags</Label>
                <TransactionTagInput key={tagResetKey} name="tagIds" options={tagOptions} />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="transaction-description">Description</Label>
            <Input
              id="transaction-description"
              name="description"
              placeholder="Optional memo"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit">Save transaction</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
