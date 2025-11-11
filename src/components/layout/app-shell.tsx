"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  CircleUserRound,
  Ellipsis,
  Loader2,
  LogOut,
  Scan,
  Plus,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

import { APP_ROUTES, PRIMARY_APP_ROUTES, SECONDARY_APP_ROUTES } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PeriodSwitcher } from "@/components/dashboard";
import { getCurrentPeriodKey } from "@/lib/period";

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const [mobileNavHeight, setMobileNavHeight] = useState(72);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, signOutUser } = useAuth();
  const { locale, t } = useI18n();

  const periodParam = searchParams?.get("period");
  const currentPeriod = periodParam ?? getCurrentPeriodKey();

  const quickActions = useMemo(
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

  const fabAction = useMemo(() => {
    if (!user) {
      return null;
    }
    const currentPath = pathname ?? "";

    if (currentPath.startsWith("/app/transactions")) {
      return null;
    }

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

  const primaryNavRoutes = PRIMARY_APP_ROUTES;
  const secondaryNavRoutes = SECONDARY_APP_ROUTES;

  const spacingVars = useMemo(() => {
    const navHeightValue = `${mobileNavHeight}px`;
    return {
      "--app-safe-area-bottom": "env(safe-area-inset-bottom, 0px)",
      "--app-mobile-nav-height": navHeightValue,
      "--app-mobile-nav-offset": "calc(var(--app-safe-area-bottom) + var(--app-mobile-nav-height))",
      "--app-mobile-nav-padding": "calc(var(--app-safe-area-bottom) + 0.9rem)",
      "--app-mobile-content-padding": "calc(var(--app-safe-area-bottom) + var(--app-mobile-nav-height) + 3.5rem)",
      "--app-mobile-fab-offset": "calc(var(--app-safe-area-bottom) + var(--app-mobile-nav-height) + 1.5rem)",
    } as CSSProperties;
  }, [mobileNavHeight]);

  const prefetchRoute = useCallback(
    (href: string) => {
      if (!href) return;
      try {
        router.prefetch(href);
      } catch {
        // ignore prefetch errors (e.g. dev mode or duplicate calls)
      }
    },
    [router],
  );

  const navigationTargets = useMemo(() => {
    const targets = new Set<string>();
    APP_ROUTES.forEach((route) => targets.add(route.href));
    quickActions.forEach((action) => targets.add(action.href));
    if (fabAction?.href) {
      targets.add(fabAction.href);
    }
    return Array.from(targets);
  }, [fabAction, quickActions]);

  useEffect(() => {
    if (!navigationTargets.length) {
      return;
    }
    navigationTargets.forEach((href) => prefetchRoute(href));
  }, [navigationTargets, prefetchRoute]);

  useEffect(() => {
    if (!loading && !user) {
      const fallback = "/app/overview";
      const target = pathname && pathname !== "/" ? pathname : fallback;
      router.replace(`/sign-in?redirectTo=${encodeURIComponent(target)}`);
    }
  }, [loading, pathname, router, user]);

  useEffect(() => {
    const navElement = mobileNavRef.current;
    if (!navElement || typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateNavHeight = () => {
      const nextHeight = Math.round(navElement.offsetHeight);
      if (!Number.isFinite(nextHeight)) {
        return;
      }
      setMobileNavHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
    };

    updateNavHeight();

    const observer = new ResizeObserver(() => {
      updateNavHeight();
    });
    observer.observe(navElement);

    window.addEventListener("resize", updateNavHeight);
    window.addEventListener("orientationchange", updateNavHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateNavHeight);
      window.removeEventListener("orientationchange", updateNavHeight);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setActionMenuOpen(false);
  }, [pathname]);

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
    <div className="flex min-h-[100dvh] bg-background" style={spacingVars}>
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
                onMouseEnter={() => prefetchRoute(route.href)}
                onFocus={() => prefetchRoute(route.href)}
              >
                <div className="flex items-center gap-2">
                  <route.icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{t(route.labelKey)}</span>
                </div>
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
      {sidebarOpen ? (
        <button
          type="button"
          aria-label={t("shell.nav.toggle")}
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:mx-0 lg:max-w-none lg:px-8 xl:mx-auto xl:max-w-7xl xl:px-10 2xl:max-w-[88rem] 2xl:px-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2" />
              <div className="flex flex-wrap items-center justify-end gap-2">
                {user && quickActions.length ? (
                  <div className="hidden items-center gap-2 md:flex">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.id}
                          variant={action.variant}
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <Link
                            href={action.href}
                            onMouseEnter={() => prefetchRoute(action.href)}
                            onFocus={() => prefetchRoute(action.href)}
                          >
                            <Icon className="size-4" aria-hidden="true" />
                            <span>{action.label}</span>
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
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
        <main className="flex flex-1 flex-col overflow-x-hidden bg-muted/30">
          <div
            className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-[var(--app-mobile-content-padding)] sm:px-6 lg:mx-0 lg:max-w-none lg:px-8 lg:pb-12 xl:mx-auto xl:max-w-7xl xl:px-10 2xl:max-w-[88rem] 2xl:px-12"
          >
            {children}
          </div>
        </main>
      </div>
      {fabAction ? (
        <Button
          asChild
          variant="default"
          size="icon"
          className="fixed right-6 z-[70] h-14 w-14 rounded-full shadow-lg md:hidden"
          style={{ bottom: "var(--app-mobile-fab-offset)" }}
        >
          <Link
            href={fabAction.href}
            aria-label={fabAction.label}
            onMouseEnter={() => prefetchRoute(fabAction.href)}
            onFocus={() => prefetchRoute(fabAction.href)}
          >
            <Plus className="size-6" aria-hidden="true" />
            <span className="sr-only">{fabAction.label}</span>
          </Link>
        </Button>
      ) : null}
      <nav
        ref={mobileNavRef}
        className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-background/95 pb-[var(--app-mobile-nav-padding)] pt-[0.35rem] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
        aria-label={t("shell.nav.toggle")}
        style={{ minHeight: "var(--app-mobile-nav-height)" }}
      >
        <div
          className="mx-auto flex max-w-3xl items-center gap-1 px-3"
        >
          {primaryNavRoutes.map((route) => {
            const isActive = pathname?.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => prefetchRoute(route.href)}
                onFocus={() => prefetchRoute(route.href)}
                onClick={() => setActionMenuOpen(false)}
              >
                <route.icon
                  className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground")}
                  aria-hidden="true"
                />
                <span className="text-[10px] tracking-wide">{t(route.labelKey)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            onClick={() => setActionMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={actionMenuOpen}
          >
            <Ellipsis className="size-5" aria-hidden="true" />
            <span className="text-[10px] tracking-wide">{t("shell.nav.more")}</span>
          </button>
        </div>
      </nav>
      <Dialog open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
        <DialogContent className="max-w-md space-y-4 p-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold">
              {t("shell.actions.title")}
            </DialogTitle>
          </DialogHeader>
          {user && quickActions.length ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("shell.actions.quick")}
              </p>
              <div className="grid gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant={action.variant}
                      className="w-full justify-start"
                      asChild
                    >
                      <Link
                        href={action.href}
                        onMouseEnter={() => prefetchRoute(action.href)}
                        onFocus={() => prefetchRoute(action.href)}
                        onClick={() => setActionMenuOpen(false)}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        <span>{action.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("shell.actions.secondaryNav")}
            </p>
            <div className="grid gap-1">
              {secondaryNavRoutes.map((route) => {
                const isActive = pathname?.startsWith(route.href);
                return (
                  <Button
                    key={route.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <Link
                      href={route.href}
                      aria-current={isActive ? "page" : undefined}
                      onMouseEnter={() => prefetchRoute(route.href)}
                      onFocus={() => prefetchRoute(route.href)}
                      onClick={() => setActionMenuOpen(false)}
                    >
                      <route.icon className="size-4" aria-hidden="true" />
                      <span>{t(route.labelKey)}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
