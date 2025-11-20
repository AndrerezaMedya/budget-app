"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type ActiveFilterChip = {
  id: string;
  label: string;
  paramKeys: string[];
};

type TransactionsFilterChipsProps = {
  chips: ActiveFilterChip[];
  heading: string;
  clearAllLabel: string;
  removeLabelTemplate: string;
};

export function TransactionsFilterChips({
  chips,
  heading,
  clearAllLabel,
  removeLabelTemplate,
}: TransactionsFilterChipsProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const chipParamKeys = useMemo(() => {
    const keys = new Set<string>();
    chips.forEach((chip) => {
      chip.paramKeys.forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [chips]);

  if (chips.length === 0) {
    return null;
  }

  const updateQuery = (keysToRemove: string[]) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    keysToRemove.forEach((key) => params.delete(key));
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const handleRemove = (chip: ActiveFilterChip) => {
    if (isPending) return;
    updateQuery(chip.paramKeys);
  };

  const handleClearAll = () => {
    if (isPending) return;
    updateQuery(chipParamKeys);
  };

  return (
    <section className="space-y-2" aria-label={heading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{heading}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleClearAll}
        >
          {clearAllLabel}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/70 px-3 py-1 text-xs text-foreground"
          >
            <span className="truncate max-w-[12rem]">{chip.label}</span>
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground transition hover:text-foreground"
              onClick={() => handleRemove(chip)}
              disabled={isPending}
              aria-label={removeLabelTemplate.replace("{{value}}", chip.label)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}
