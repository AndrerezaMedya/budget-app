"use client";

import { Button } from "@/components/ui/button";

export default function BudgetsError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <div className="space-y-3 rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-base font-semibold">Unable to load budgets</h2>
            <p className="text-sm text-muted-foreground">
                {error.message || "We couldn’t load your budgets just now."}
            </p>
            <Button variant="outline" size="sm" onClick={reset}>
                Try again
            </Button>
        </div>
    );
}
