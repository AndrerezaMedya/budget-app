"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  CircleUserRound,
  Loader2,
  LogOut,
  Menu,
  Scan,
  Plus,
} from "lucide-react";
import * as React from "react";

import { APP_ROUTES } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PeriodSwitcher } from "@/components/dashboard";
import { getCurrentPeriodKey } from "@/lib/period";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, signOutUser } = useAuth();
  const { locale, t } = useI18n();

  const periodParam = searchParams?.get("period");
  const currentPeriod = periodParam ?? getCurrentPeriodKey();

  const quickActions = React.useMemo(
    () =>
      user
        ? [
            {
              id: "add-transaction",
              href: "/app/transactions",
              label: t("shell.quickActions.addTransaction"),
              icon: Plus,
              variant: "default" as const,
            },
            {
              id: "upload-receipt",
              href: "/app/receipts",
              label: t("shell.quickActions.uploadReceipt"),
              icon: Scan,
              variant: "secondary" as const,
            },
            {
              id: "transfer",
              href: "/app/transactions?type=transfer",
              label: t("shell.quickActions.transfer"),
              icon: ArrowLeftRight,
              variant: "ghost" as const,
            },
          ]
        : [],
    [t, user],
  );

  const fabAction = React.useMemo(() => {
    if (!user) {
      return null;
    }
    const currentPath = pathname ?? "";

    if (currentPath.startsWith("/app/budgets")) {
      return {
        href: "/app/budgets",
        label: t("budgets.toggle.open"),
      };
    }

    if (currentPath.startsWith("/app/accounts")) {
      return {
        href: "/app/accounts",
        label: t("accounts.toggle.open"),
      };
    }

    return {
      href: "/app/transactions",
      label: t("transactions.toggle.open"),
    };
  }, [pathname, t, user]);

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
        <p className="mt-3">{t("shell.loading.title")}</p>
      </div>
    );
  }

  const accountLabel =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    t("shell.accountFallback");
  const accountSubline = user?.email
    ? t("shell.accountSignedInAs", { email: user.email })
    : t("shell.accountPendingEmail");

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
              {t("brand.name")}
            </p>
            <p className="text-xs text-muted-foreground">{t("brand.subtitle")}</p>
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
                  <span className="text-sm font-medium">{t(route.labelKey)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t(route.descriptionKey)}
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
                  {t("auth.signOut")}
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                  <Link href="/sign-in">{t("auth.signIn")}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>
  <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:mx-0 lg:max-w-none lg:px-8 xl:mx-auto xl:max-w-7xl xl:px-10 2xl:max-w-[88rem] 2xl:px-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label={t("shell.nav.toggle")}
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
                <div className="text-sm text-muted-foreground">
                  {t("brand.tagline")}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {user && quickActions.length
                  ? quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.id}
                          variant={action.variant}
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <Link href={action.href}>
                            <Icon className="size-4" aria-hidden="true" />
                            <span>{action.label}</span>
                          </Link>
                        </Button>
                      );
                    })
                  : null}
                <ThemeToggle />
                {user ? (
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" aria-hidden="true" />
                    <span>{t("auth.signOut")}</span>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/sign-in">{t("auth.signIn")}</Link>
                  </Button>
                )}
              </div>
            </div>
            {user ? (
              <PeriodSwitcher
                period={currentPeriod}
                locale={locale}
                labels={{
                  heading: t("overview.periodSwitcher.label"),
                  thisMonth: t("period.options.thisMonth"),
                  lastMonth: t("period.options.lastMonth"),
                  custom: t("period.options.custom"),
                  customComingSoon: t("period.options.customComingSoon"),
                }}
                className="self-end rounded-xl border-border/70 bg-background/80 px-3 py-2 shadow-none"
              />
            ) : null}
          </div>
        </header>
        <main className="flex flex-1 flex-col bg-muted/30">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:mx-0 lg:max-w-none lg:px-8 xl:mx-auto xl:max-w-7xl xl:px-10 2xl:max-w-[88rem] 2xl:px-12">
            {children}
          </div>
        </main>
      </div>
      {fabAction ? (
        <Button
          asChild
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg md:hidden"
        >
          <Link href={fabAction.href} aria-label={fabAction.label}>
            <Plus className="size-6" aria-hidden="true" />
            <span className="sr-only">{fabAction.label}</span>
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
