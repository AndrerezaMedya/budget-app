"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatPeriodLabel,
  getCurrentPeriodKey,
  shiftPeriodKey,
} from "@/lib/period";

type PeriodSwitcherLabels = {
  heading: string;
  thisMonth: string;
  lastMonth: string;
  custom: string;
  customComingSoon: string;
};

type PeriodSwitcherProps = {
  period: string;
  locale: string;
  labels: PeriodSwitcherLabels;
  className?: string;
};

export function PeriodSwitcher({ period, locale, labels, className }: PeriodSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSystemPeriod = useMemo(() => getCurrentPeriodKey(), []);
  const quickOptions = useMemo(
    () => [
      {
        id: "this-month",
        label: labels.thisMonth,
        value: currentSystemPeriod,
      },
      {
        id: "last-month",
        label: labels.lastMonth,
        value: shiftPeriodKey(currentSystemPeriod, -1),
      },
    ],
    [currentSystemPeriod, labels.lastMonth, labels.thisMonth],
  );

  const periodLabel = useMemo(
    () => formatPeriodLabel(period, locale),
    [period, locale],
  );

  const handleSelect = (nextPeriod: string) => {
    if (!pathname) return;

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPeriod === currentSystemPeriod) {
        params.delete("period");
      } else {
        params.set("period", nextPeriod);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-elevation md:w-auto md:flex-row md:items-center md:gap-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-left md:border-r md:border-border/60 md:pr-4">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.heading}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {periodLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {quickOptions.map((option) => {
          const isActive = option.value === period;
          return (
            <Button
              key={option.id}
              type="button"
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                isActive
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={isActive}
              disabled={isPending || isActive}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          className="rounded-full px-3 py-1.5 text-sm text-muted-foreground"
          disabled
          title={labels.customComingSoon}
          aria-label={labels.customComingSoon}
        >
          {labels.custom}
        </Button>
      </div>
    </div>
  );
}
