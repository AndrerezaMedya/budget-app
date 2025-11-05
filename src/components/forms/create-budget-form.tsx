"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import { createBudgetAction } from "@/actions/budgets";
import { initialActionState } from "@/actions/types";
import type { CategoryWithParent } from "@/lib/supabase/queries/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateBudgetFormProps {
  categories: CategoryWithParent[];
  defaultPeriod: string;
}

export function CreateBudgetForm({ categories, defaultPeriod }: CreateBudgetFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(createBudgetAction, initialActionState);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }
    const frame = requestAnimationFrame(() => {
      formRef.current?.reset();
      setIsOpen(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [state.status]);

  const options = useMemo(() => {
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

  const toggle = () => {
    setIsOpen((prev) => {
      if (prev) {
        formRef.current?.reset();
      }
      return !prev;
    });
  };
  const hasCategories = options.length > 0;

  return (
    <div className="flex flex-col items-end gap-3">
      <Button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2"
        variant={isOpen ? "secondary" : "default"}
        disabled={!hasCategories}
      >
        {isOpen ? "Cancel" : "Create budget"}
      </Button>

      {!hasCategories ? (
        <p className="text-sm text-muted-foreground" role="status">
          Add a category before creating budgets.
        </p>
      ) : null}

      {isOpen && hasCategories ? (
        <form
          ref={formRef}
          action={formAction}
          className="w-full min-w-[24rem] space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="budget-category">Category</Label>
            <select
              id="budget-category"
              name="categoryId"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select a category
              </option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-period">Period</Label>
            <Input
              id="budget-period"
              name="period"
              type="month"
              defaultValue={defaultPeriod}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Amount</Label>
            <Input
              id="budget-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Stored in minor units (multiply by 100) on submit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="budget-rollover"
              name="rollover"
              type="checkbox"
              className="size-4 rounded border border-input"
              defaultChecked
            />
            <Label htmlFor="budget-rollover" className="text-sm font-normal">
              Enable rollover
            </Label>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button type="submit">Save budget</Button>
            {state.message ? (
              <p
                className="text-sm"
                role={state.status === "error" ? "alert" : undefined}
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      ) : null}

      {state.status === "error" && !isOpen && state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" && !isOpen && state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
    </div>
  );
}
