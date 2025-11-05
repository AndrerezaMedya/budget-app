"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import { deleteBudgetAction, updateBudgetAction } from "@/actions/budgets";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryWithParent } from "@/lib/supabase/queries/categories";
import type { BudgetWithSummary } from "@/lib/supabase/queries/budgets";

interface BudgetActionsProps {
  budget: BudgetWithSummary;
  categories: CategoryWithParent[];
}

function toInputAmount(value: number): string {
  return (value / 100).toFixed(2);
}

export function BudgetActions({ budget, categories }: BudgetActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, editAction] = useFormState(updateBudgetAction, initialActionState);
  const [deleteState, deleteAction] = useFormState(deleteBudgetAction, initialActionState);
  const { toast } = useToast();
  const editStatusRef = useRef(editState.status);
  const deleteStatusRef = useRef(deleteState.status);

  const categoryOptions = useMemo(() => {
    return categories.map((category) => ({
      id: category.id,
      label: category.parentName
        ? `${category.parentName} • ${category.name}`
        : category.name,
    }));
  }, [categories]);

  useEffect(() => {
    if (editState.status === editStatusRef.current) {
      return;
    }
    editStatusRef.current = editState.status;

    if (editState.status === "success") {
      toast({
        title: "Budget updated",
        description: editState.message,
        variant: "success",
      });
      const frame = requestAnimationFrame(() => setIsEditing(false));
      return () => cancelAnimationFrame(frame);
    }

    if (editState.status === "error") {
      toast({
        title: "Unable to update budget",
        description: editState.message,
        variant: "error",
      });
    }
  }, [editState.status, editState.message, toast]);

  useEffect(() => {
    if (deleteState.status === deleteStatusRef.current) {
      return;
    }
    deleteStatusRef.current = deleteState.status;

    if (deleteState.status === "success") {
      toast({
        title: "Budget removed",
        description: deleteState.message,
        variant: "success",
      });
    }

    if (deleteState.status === "error") {
      toast({
        title: "Unable to remove budget",
        description: deleteState.message,
        variant: "error",
      });
    }
  }, [deleteState.status, deleteState.message, toast]);

  const handleDeleteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      `Remove the budget for ${budget.categoryName}? Historical summaries remain intact.`,
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
            <Label htmlFor={`budget-edit-category-${budget.id}`}>Category</Label>
            <select
              id={`budget-edit-category-${budget.id}`}
              name="categoryId"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={budget.categoryId}
              required
            >
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`budget-edit-amount-${budget.id}`}>Amount</Label>
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
              <Label htmlFor={`budget-edit-period-${budget.id}`}>Period</Label>
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
              Enable rollover
            </Label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save changes
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
          <form action={deleteAction} onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="budgetId" value={budget.id} />
            <Button type="submit" variant="destructive" size="sm">
              Remove
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
