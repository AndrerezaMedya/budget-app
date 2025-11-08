"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TransactionsSearchInputProps {
  initialValue: string;
  label: string;
  placeholder: string;
  clearLabel: string;
}

const DEBOUNCE_DELAY = 300;

export function TransactionsSearchInput({ initialValue, label, placeholder, clearLabel }: TransactionsSearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasMountedRef = useRef(false);
  const searchParamsString = searchParams?.toString();

  useEffect(() => {
    // Keep local state in sync when the search params change externally.
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const params = new URLSearchParams(searchParamsString ?? "");
    const trimmed = value.trim();
    const currentQueryValue = params.get("query") ?? "";

    // Bail out when the input matches the current query parameter to avoid redundant requests.
    if (trimmed === currentQueryValue || (trimmed.length === 0 && currentQueryValue === "")) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (trimmed.length === 0) {
        params.delete("query");
      } else {
        params.set("query", trimmed);
      }

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, pathname, router, searchParamsString]);

  const handleClear = () => {
    setValue("");
  };

  return (
    <div className="group relative flex w-full items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 text-sm shadow-sm">
      <Search className="size-4 text-muted-foreground" aria-hidden="true" />
      <label className="sr-only" htmlFor="transactions-search-input">
        {label}
      </label>
      <Input
        id="transactions-search-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-6 flex-1 border-none bg-transparent p-0 text-sm text-foreground shadow-none focus-visible:outline-none focus-visible:ring-0"
        aria-label={label}
        disabled={isPending}
      />
      {value.length > 0 ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleClear}
          disabled={isPending}
          aria-label={clearLabel}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
