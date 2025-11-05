"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { createBudgetAction } from "@/actions/budgets";
import { initialActionState } from "@/actions/types";
import { listPredefinedCategoriesByType } from "@/config/category-definitions";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";

interface CreateBudgetFormProps {
  defaultPeriod: string;
}

export function CreateBudgetForm({ defaultPeriod }: CreateBudgetFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createBudgetAction, initialActionState);
  const { toast } = useToast();
  const statusRef = useRef(state.status);
  const { t } = useI18n();

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: t("budgets.toast.create.success.title"),
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
        title: t("budgets.toast.create.error.title"),
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast, t]);

  const options = useMemo(() => {
    const translateKey = (key: string | null, fallback: string) =>
      key ? t(key as Parameters<typeof t>[0]) : fallback;

    return listPredefinedCategoriesByType("expense").map((category) => ({
      value: category.slug,
      label: translateKey(category.nameKey, category.name),
    }));
  }, [t]);

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
    <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
      <Button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 sm:w-auto"
        variant={isOpen ? "secondary" : "default"}
        disabled={!hasCategories}
        size="sm"
        {...(isOpen ? { "aria-expanded": true } : {})}
      >
        {isOpen ? t("budgets.toggle.close") : t("budgets.toggle.open")}
      </Button>

      {!hasCategories ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t("budgets.noCategories")}
        </p>
      ) : null}

      {isOpen && hasCategories ? (
        <form
          ref={formRef}
          action={formAction}
          className="w-full max-w-full space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-w-[24rem]"
        >
          <div className="space-y-2">
            <Label htmlFor="budget-category">{t("budgets.form.category")}</Label>
            <select
              id="budget-category"
              name="categorySelection"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                {t("budgets.form.category.placeholder")}
              </option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-period">{t("budgets.form.period")}</Label>
            <Input
              id="budget-period"
              name="period"
              type="month"
              defaultValue={defaultPeriod}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">{t("budgets.form.amount")}</Label>
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
              {t("budgets.form.amount.tip")}
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
              {t("budgets.form.rollover")}
            </Label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit">{t("budgets.save")}</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
