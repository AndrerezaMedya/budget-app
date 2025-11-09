"use client";

import { Button } from "@/components/ui/button";

export default function OverviewError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <div className="space-y-3 rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-base font-semibold">Unable to load overview</h2>
            <p className="text-sm text-muted-foreground">
                {error.message || "Something went wrong while loading your workspace."}
            </p>
            <Button variant="outline" size="sm" onClick={reset}>
                Try again
            </Button>
        </div>
    );
}
