"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastRecord = ToastOptions & {
  id: string;
  createdAt: number;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_AFTER = 4_000;

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeoutId = timeouts.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeouts.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "default" }: ToastOptions) => {
      if (!title) return;
      const id = generateId();
      setToasts((current) => [
        ...current,
        {
          id,
          title,
          description,
          variant,
          createdAt: Date.now(),
        },
      ]);

      const timeoutId = window.setTimeout(() => dismiss(id), DISMISS_AFTER);
      timeouts.current.set(id, timeoutId);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--app-mobile-nav-offset,_72px)+1rem)] z-[80] flex justify-center px-4 sm:inset-auto sm:right-4 sm:top-4 sm:bottom-auto sm:flex-col sm:items-end sm:gap-2 sm:px-0">
        {toasts.map((toastRecord) => {
          const variantClasses =
            toastRecord.variant === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : toastRecord.variant === "error"
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-border bg-card text-foreground";

          return (
            <div
              key={toastRecord.id}
              className={cn(
                "pointer-events-auto mb-2 w-full max-w-sm overflow-hidden rounded-md border shadow-lg transition focus-within:ring-2 focus-within:ring-primary",
                variantClasses,
              )}
              role="status"
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {toastRecord.title}
                  </p>
                  {toastRecord.description ? (
                    <p className="text-sm opacity-85">{toastRecord.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toastRecord.id)}
                  className="rounded-md p-1 text-sm font-medium opacity-70 transition hover:opacity-100"
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
