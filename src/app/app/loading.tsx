export default function Loading() {
    return (
        <div className="flex min-h-screen w-full flex-1 flex-col bg-muted/30">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:mx-0 lg:max-w-none lg:px-8 xl:mx-auto xl:max-w-7xl xl:px-10 2xl:max-w-[88rem] 2xl:px-12">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-6 w-24 animate-pulse rounded bg-muted/60" />
                        <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
                    </div>
                    <div className="h-10 w-32 animate-pulse rounded-full bg-muted/40" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4"
                        >
                            <div className="h-5 w-28 animate-pulse rounded bg-muted/50" />
                            <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
                            <div className="h-6 w-20 animate-pulse rounded bg-muted/60" />
                            <div className="h-3 w-32 animate-pulse rounded bg-muted/30" />
                        </div>
                    ))}
                </div>
                <div className="grid flex-1 gap-4 lg:grid-cols-5">
                    <div className="h-full min-h-[16rem] rounded-xl border border-border/70 bg-muted/20 lg:col-span-3" />
                    <div className="h-full min-h-[16rem] rounded-xl border border-border/70 bg-muted/20 lg:col-span-2" />
                </div>
            </div>
        </div>
    );
}
