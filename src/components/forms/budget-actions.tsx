"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { deleteBudgetAction, updateBudgetAction } from "@/actions/budgets";
import { initialActionState } from "@/actions/types";
import { listPredefinedCategoriesByType } from "@/config/category-definitions";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BudgetWithSummary } from "@/lib/supabase/queries/budgets";
import { useI18n } from "@/components/providers/i18n-provider";

interface BudgetActionsProps {
  budget: BudgetWithSummary;
}

function toInputAmount(value: number): string {
  return (value / 100).toFixed(2);
}

export function BudgetActions({ budget }: BudgetActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, editAction] = useActionState(updateBudgetAction, initialActionState);
  const [deleteState, deleteAction] = useActionState(deleteBudgetAction, initialActionState);
  const { toast } = useToast();
  const editStatusRef = useRef(editState.status);
  const deleteStatusRef = useRef(deleteState.status);
  const { t } = useI18n();

  const categoryOptions = useMemo(() => {
    const translateKey = (key: string | null, fallback: string) =>
      key ? t(key as Parameters<typeof t>[0]) : fallback;

    return listPredefinedCategoriesByType("expense").map((category) => ({
      value: category.slug,
      label: translateKey(category.nameKey, category.name),
    }));
  }, [t]);

  const selectionValue = useMemo(() => {
    if (budget.categorySlug) {
      if (budget.subcategorySlug) {
        return `${budget.categorySlug}::${budget.subcategorySlug}`;
      }
      return budget.categorySlug;
    }
    return budget.categoryId;
  }, [budget.categorySlug, budget.subcategorySlug, budget.categoryId]);

  const resolvedCategoryOptions = useMemo(() => {
    if (!selectionValue) {
      return categoryOptions;
    }

    if (selectionValue && categoryOptions.some((option) => option.value === selectionValue)) {
      return categoryOptions;
    }

    if (selectionValue) {
      return [{ value: selectionValue, label: budget.categoryName }, ...categoryOptions];
    }

    return categoryOptions;
  }, [categoryOptions, selectionValue, budget.categoryName]);

  useEffect(() => {
    if (editState.status === editStatusRef.current) {
      return;
    }
    editStatusRef.current = editState.status;

    if (editState.status === "success") {
      toast({
        title: t("budgets.toast.update.success.title"),
        description: editState.message,
        variant: "success",
      });
      const frame = requestAnimationFrame(() => setIsEditing(false));
      return () => cancelAnimationFrame(frame);
    }

    if (editState.status === "error") {
      toast({
        title: t("budgets.toast.update.error.title"),
        description: editState.message,
        variant: "error",
      });
    }
  }, [editState.status, editState.message, toast, t]);

  useEffect(() => {
    if (deleteState.status === deleteStatusRef.current) {
      return;
    }
    deleteStatusRef.current = deleteState.status;

    if (deleteState.status === "success") {
      toast({
        title: t("budgets.toast.delete.success.title"),
        description: deleteState.message,
        variant: "success",
      });
    }

    if (deleteState.status === "error") {
      toast({
        title: t("budgets.toast.delete.error.title"),
        description: deleteState.message,
        variant: "error",
      });
    }
  }, [deleteState.status, deleteState.message, toast, t]);

  const handleDeleteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      t("budgets.actions.confirmDelete", { category: budget.categoryName }),
    );
    if (!confirmed) {
      event.preventDefault();
    }
  };

  return (
    <div className="space-y-3">
      {isEditing ? (
        <form
          action={editAction}
          className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3"
        >
          <input type="hidden" name="budgetId" value={budget.id} />
          <div className="space-y-1">
            <Label htmlFor={`budget-edit-category-${budget.id}`}>
              {t("budgets.form.category")}
            </Label>
            <select
              id={`budget-edit-category-${budget.id}`}
              name="categorySelection"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={selectionValue}
              required
            >
              {resolvedCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`budget-edit-amount-${budget.id}`}>
                {t("budgets.form.amount")}
              </Label>
              <Input
                id={`budget-edit-amount-${budget.id}`}
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                defaultValue={toInputAmount(budget.plannedMinor)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`budget-edit-period-${budget.id}`}>
                {t("budgets.form.period")}
              </Label>
              <Input
                id={`budget-edit-period-${budget.id}`}
                name="period"
                type="month"
                defaultValue={budget.period}
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id={`budget-edit-rollover-${budget.id}`}
              name="rollover"
              type="checkbox"
              className="size-4 rounded border border-input"
              defaultChecked={budget.rollover}
            />
            <Label htmlFor={`budget-edit-rollover-${budget.id}`} className="text-sm font-normal">
              {t("budgets.form.rollover")}
            </Label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              {t("budgets.toggle.close")}
            </Button>
            <Button type="submit" size="sm">
              {t("budgets.actions.saveChanges")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            {t("budgets.actions.edit")}
          </Button>
          <form action={deleteAction} onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="budgetId" value={budget.id} />
            <Button type="submit" variant="destructive" size="sm">
              {t("budgets.actions.remove")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
