"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type TagOption = {
  id: string;
  name: string;
  color: string | null;
};

interface TransactionTagInputProps {
  name: string;
  options: TagOption[];
}

export function TransactionTagInput({ name, options }: TransactionTagInputProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const hiddenField = document.getElementById(`${name}-hidden`) as HTMLInputElement | null;
    if (hiddenField) {
      hiddenField.value = selectedIds.join(",");
    }
  }, [name, selectedIds]);

  const colorMap = useMemo(() => {
    const defaultColor = "bg-muted text-muted-foreground";
    return options.reduce<Record<string, string>>((acc, current) => {
      acc[current.id] = current.color ?? defaultColor;
      return acc;
    }, {});
  }, [options]);

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          const colorClass = colorMap[option.id];
          return (
            <button
              key={option.id}
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
              )}
              onClick={() => toggle(option.id)}
              aria-pressed={isSelected}
            >
              <span className={cn("inline-flex items-center gap-1", colorClass)}>
                {option.name}
              </span>
            </button>
          );
        })}
      </div>
      <input id={`${name}-hidden`} type="hidden" name={name} value={selectedIds.join(",")} />
    </div>
  );
}
