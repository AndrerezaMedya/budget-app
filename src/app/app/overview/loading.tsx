export default function Loading() {
    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <div className="h-8 w-48 animate-pulse rounded bg-muted/60" />
                <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-56 max-w-full animate-pulse rounded bg-muted/40" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4"
                    >
                        <div className="h-5 w-32 animate-pulse rounded bg-muted/50" />
                        <div className="h-4 w-48 animate-pulse rounded bg-muted/40" />
                        <div className="h-6 w-24 animate-pulse rounded bg-muted/60" />
                        <div className="h-3 w-40 animate-pulse rounded bg-muted/30" />
                    </div>
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-5">
                <div className="h-64 rounded-xl border border-border/70 bg-muted/20 lg:col-span-3" />
                <div className="h-64 rounded-xl border border-border/70 bg-muted/20 lg:col-span-2" />
            </div>
        </div>
    );
}
