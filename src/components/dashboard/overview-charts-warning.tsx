'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type OverviewChartsWarningProps = {
  period: string;
  errorMessage: string;
  messages: {
    title: string;
    description: string;
    lastErrorLabel: string;
    retryLabel: string;
    retryingLabel: string;
    retryFailedTemplate: string;
  };
};

type RetryState = "idle" | "pending" | "error" | "success";

export function OverviewChartsWarning({ period, errorMessage, messages }: OverviewChartsWarningProps) {
  const router = useRouter();
  const [status, setStatus] = useState<RetryState>("idle");
  const [retryError, setRetryError] = useState<string | null>(null);

  const isPending = status === "pending";

  async function handleRetry() {
    setStatus("pending");
    setRetryError(null);

    const searchParams = new URLSearchParams();
    if (period) {
      searchParams.append("period", period);
    }
    searchParams.append("force-refresh", "1");

    try {
      const response = await fetch(`/api/overview/charts?${searchParams.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Request failed with status ${response.status}`);
      }

      setStatus("success");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setRetryError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  const lastErrorLine = messages.lastErrorLabel;
  const retryFailedLine = retryError
    ? messages.retryFailedTemplate.replace("{{error}}", retryError)
    : null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-100/70 p-4 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4" aria-hidden="true" />
        <div className="space-y-2">
          <div className="font-medium">{messages.title}</div>
          <p className="leading-relaxed">{messages.description}</p>
          <p className="text-xs text-amber-800/80">{lastErrorLine}</p>
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2 border-amber-500 text-amber-900 hover:bg-amber-200"
              onClick={handleRetry}
              disabled={isPending}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {isPending ? messages.retryingLabel : messages.retryLabel}
            </Button>
            {status === "error" && retryFailedLine ? (
              <span className="text-xs text-amber-800/80">{retryFailedLine}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
