"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ToggleContextValue = {
  activeValue: string | null;
  setActiveValue: (value: string) => void;
};

const ToggleGroupContext = createContext<ToggleContextValue | null>(null);

type ToggleGroupProps = {
  heading: string;
  initialValue?: string | null;
  onChange?: (value: string) => void;
  children: React.ReactNode;
};

type ToggleButtonProps = {
  children: React.ReactNode;
  value: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;

export function ToggleGroup({ heading, initialValue = null, onChange, children }: ToggleGroupProps) {
  const [activeValue, setActiveValue] = useState<string | null>(initialValue);

  const contextValue = useMemo<ToggleContextValue>(
    () => ({
      activeValue,
      setActiveValue: (value: string) => {
        setActiveValue(value);
        onChange?.(value);
      },
    }),
    [activeValue, onChange],
  );

  return (
    <ToggleGroupContext.Provider value={contextValue}>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {heading}
        </p>
        <div className="inline-flex flex-wrap gap-2" role="group">
          {children}
        </div>
      </div>
    </ToggleGroupContext.Provider>
  );
}

export function ToggleButton({ children, value, className, ...props }: ToggleButtonProps) {
  const context = useContext(ToggleGroupContext);

  if (!context) {
    throw new Error("ToggleButton must be used within a ToggleGroup");
  }

  const isActive = context.activeValue === value;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition",
        isActive
          ? "border-primary bg-primary text-primary-foreground shadow"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
        className,
      )}
      {...props}
      onClick={() => context.setActiveValue(value)}
    >
      {children}
    </button>
  );
}
