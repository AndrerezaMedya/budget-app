import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-surface-muted/50 px-6 py-10 text-center text-muted-foreground",
        className,
      )}
    >
      {icon ? <div className="text-link" aria-hidden="true">{icon}</div> : null}
      {title ? (
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      ) : null}
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
