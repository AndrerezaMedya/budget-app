"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";

import { createCategoryAction } from "@/actions/categories";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ICON_OPTIONS = [
  { value: "lucide:piggy-bank", label: "Income" },
  { value: "lucide:shopping-cart", label: "Groceries" },
  { value: "lucide:bus", label: "Transport" },
  { value: "lucide:utensils", label: "Dining" },
  { value: "lucide:home", label: "Housing" },
  { value: "lucide:activity", label: "Wellness" },
];

const COLOR_OPTIONS = [
  { value: "", label: "Default" },
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#d97706", label: "Amber" },
  { value: "#dc2626", label: "Red" },
  { value: "#7c3aed", label: "Indigo" },
];

export function CreateCategoryForm() {
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon</Label>
              <select
                id="category-icon"
                name="icon"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">No icon</option>
                {ICON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <select
                id="category-color"
                name="color"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option.value || "default"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Pick an icon and color to keep reports easy to scan.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit">Save category</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
