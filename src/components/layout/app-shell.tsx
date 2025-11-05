"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUserRound, Loader2, LogOut, Menu } from "lucide-react";
import * as React from "react";

import { APP_ROUTES } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOutUser } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      const fallback = "/app/overview";
      const target = pathname && pathname !== "/" ? pathname : fallback;
      router.replace(`/sign-in?redirectTo=${encodeURIComponent(target)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p className="mt-3">Loading workspace...</p>
      </div>
    );
  }

  const accountLabel =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "Personal workspace";
  const accountSubline = user?.email
    ? `Signed in as ${user.email}`
    : "Supabase session pending email association.";

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error("Failed to sign out", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-semibold">dY</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              Personal Finance
            </p>
            <p className="text-xs text-muted-foreground">App Workspace</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {APP_ROUTES.map((route) => {
            const isActive = pathname?.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "group flex flex-col gap-1 rounded-lg px-3 py-2 transition",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <route.icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{route.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {route.description}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <CircleUserRound className="size-9 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={accountLabel}>
                  {accountLabel}
                </p>
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={accountSubline}
                >
                  {accountSubline}
                </p>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full whitespace-nowrap sm:w-auto"
                >
                  <LogOut className="mr-1 size-4" aria-hidden="true" />
                  Sign out
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
            <div className="text-sm text-muted-foreground">
              Offline-friendly finance workspace
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-1 size-4" aria-hidden="true" />
                  Sign out
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full sm:w-auto"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 bg-muted/30 px-4 py-6 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
