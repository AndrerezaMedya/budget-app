import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type MetricTrend = "up" | "down" | "flat";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  subtext?: string;
  trend?: MetricTrend;
  trendLabel?: string;
  rightSlot?: ReactNode;
  className?: string;
};

const trendDotClass: Record<MetricTrend, string> = {
  up: "bg-positive",
  down: "bg-danger",
  flat: "bg-muted-foreground",
};

const trendTextClass: Record<MetricTrend, string> = {
  up: "text-positive",
  down: "text-danger",
  flat: "text-muted-foreground",
};

export function MetricCard({
  label,
  value,
  description,
  subtext,
  trend,
  trendLabel,
  rightSlot,
  className,
}: MetricCardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface shadow-elevation p-5",
        className,
      )}
      aria-label={label}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {trend ? (
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                  trendDotClass[trend],
                )}
                aria-hidden="true"
              />
            ) : null}
            <span className="leading-none">{label}</span>
          </div>
          {description ? (
            <p className="text-xs font-normal text-muted-foreground/80">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {trend && trendLabel ? (
            <span
              className={cn(
                "rounded-full bg-secondary px-2 py-1 font-medium",
                trendTextClass[trend],
              )}
            >
              {trendLabel}
            </span>
          ) : null}
          {rightSlot}
        </div>
      </header>

      <div className="text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>

      {subtext ? (
        <p className="text-sm text-muted-foreground">{subtext}</p>
      ) : null}
    </section>
  );
}
