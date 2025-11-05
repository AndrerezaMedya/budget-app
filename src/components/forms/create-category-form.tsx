"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import { createCategoryAction } from "@/actions/categories";
import { initialActionState } from "@/actions/types";
import type { CategoryWithParent } from "@/lib/supabase/queries/categories";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateCategoryFormProps {
  categories: CategoryWithParent[];
}

export function CreateCategoryForm({ categories }: CreateCategoryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(createCategoryAction, initialActionState);
  const { toast } = useToast();
  const statusRef = useRef(state.status);

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: "Category created",
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
        title: "Unable to create category",
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast]);

  const parentOptions = useMemo(() => {
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

  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
      <Button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 sm:w-auto"
        variant={isOpen ? "secondary" : "default"}
        size="sm"
        {...(isOpen ? { "aria-expanded": true } : {})}
      >
        {isOpen ? "Cancel" : "Add category"}
      </Button>

      {isOpen ? (
        <form
          ref={formRef}
          action={formAction}
          className="w-full max-w-full space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-w-[24rem]"
        >
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              name="name"
              placeholder="e.g. Groceries"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-parent">Parent (optional)</Label>
            <select
              id="category-parent"
              name="parentId"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="">No parent</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon (optional)</Label>
              <Input
                id="category-icon"
                name="icon"
                placeholder="lucide:shopping-cart"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-color">Color (optional)</Label>
              <Input id="category-color" name="color" placeholder="#2563eb" />
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Parent categories help organise reports and budgets into groups.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit">Save category</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
