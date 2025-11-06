"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createCategoryAction } from "@/actions/categories";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  PREDEFINED_CATEGORIES,
  type PredefinedCategoryType,
  type PredefinedSubcategory,
} from "@/config/category-definitions";

const TYPE_OPTIONS: Array<{
  value: PredefinedCategoryType;
  labelKey: "categories.form.type.expense" | "categories.form.type.income";
}> = [
  { value: "expense", labelKey: "categories.form.type.expense" },
  { value: "income", labelKey: "categories.form.type.income" },
];

export function CreateCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createCategoryAction, initialActionState);
  const { toast } = useToast();
  const statusRef = useRef(state.status);
  const { t } = useI18n();
  const [categoryType, setCategoryType] = useState<PredefinedCategoryType>("expense");
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [subcategorySlug, setSubcategorySlug] = useState<string>("");

  const resetCategorySelection = useCallback(() => {
    setCategoryType("expense");
    setCategorySlug("");
    setSubcategorySlug("");
  }, []);

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: t("categories.toast.create.success.title"),
        description: state.message,
        variant: "success",
      });

      const frame = requestAnimationFrame(() => {
        formRef.current?.reset();
        resetCategorySelection();
        setIsOpen(false);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (state.status === "error") {
      toast({
        title: t("categories.toast.create.error.title"),
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast, t, resetCategorySelection]);

  const toggle = () => {
    setIsOpen((prev) => {
      if (prev) {
        formRef.current?.reset();
        resetCategorySelection();
      }
      return !prev;
    });
  };

  const categoryOptions = useMemo(() => {
    return PREDEFINED_CATEGORIES.filter((category) => category.type === categoryType);
  }, [categoryType]);

  const selectedCategory = useMemo(() => {
    return categoryOptions.find((category) => category.slug === categorySlug) ?? null;
  }, [categoryOptions, categorySlug]);

  const subcategoryOptions = useMemo(() => selectedCategory?.subcategories ?? [], [selectedCategory]);

  const selectedSubcategory: PredefinedSubcategory | null = useMemo(() => {
    if (!subcategorySlug) return null;
    return subcategoryOptions.find((entry) => entry.slug === subcategorySlug) ?? null;
  }, [subcategoryOptions, subcategorySlug]);

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
        {isOpen ? t("categories.toggle.close") : t("categories.toggle.open")}
      </Button>

      {isOpen ? (
        <form
          ref={formRef}
          action={formAction}
          className="w-full max-w-full space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-w-[24rem]"
        >
          <div className="space-y-2">
            <Label htmlFor="category-type">{t("categories.form.type.label")}</Label>
            <select
              id="category-type"
              name="categoryType"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={categoryType}
              onChange={(event) => {
                setCategoryType(event.target.value as PredefinedCategoryType);
                setCategorySlug("");
                setSubcategorySlug("");
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

          <div className="space-y-2">
            <Label htmlFor="category-select">{t("categories.form.category.label")}</Label>
            <select
              id="category-select"
              name="categorySlug"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={categorySlug}
              onChange={(event) => {
                setCategorySlug(event.target.value);
                setSubcategorySlug("");
              }}
              required
            >
              <option value="" disabled>
                {t("categories.form.category.placeholder")}
              </option>
              {categoryOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {t(option.nameKey as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>

          {categoryType === "expense" && subcategoryOptions.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="subcategory-select">{t("categories.form.subcategory.label")}</Label>
              <select
                id="subcategory-select"
                name="subcategorySlug"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={subcategorySlug}
                onChange={(event) => setSubcategorySlug(event.target.value)}
              >
                <option value="">
                  {t("categories.form.subcategory.optional")}
                </option>
                {subcategoryOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {t(option.nameKey as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("categories.form.subcategory.help")}
              </p>
            </div>
          ) : null}

          {selectedCategory ? (
            <div className="rounded-md border border-dashed border-border/80 p-3 text-sm">
              <p className="font-medium">
                {t("categories.form.preview.title", {
                  category: t(selectedCategory.nameKey as Parameters<typeof t>[0]),
                })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {t("categories.form.preview.icon")}
                  </span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem]">
                    {selectedSubcategory?.icon ?? selectedCategory.icon}
                  </code>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {t("categories.form.preview.color")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-flex size-3 rounded-full border border-border"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem]">
                    {selectedCategory.color}
                  </code>
                </span>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>{t("categories.form.tip.hardened")}</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit">{t("categories.form.save")}</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
