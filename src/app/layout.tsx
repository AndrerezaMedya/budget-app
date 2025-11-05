import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/translations";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "dY Personal Finance Tracker",
  description:
    "Offline-first budgeting app for tracking accounts, budgets, and cash flow with Next.js and Supabase.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const initialUser = session?.user ?? null;
  let locale: Locale = "en";

  if (initialUser) {
    const { data } = await supabase
      .from("profiles")
      .select("locale")
      .eq("id", initialUser.id)
      .maybeSingle();

    if (data && (data.locale === "en" || data.locale === "id")) {
      locale = data.locale;
    }
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider>
          <AuthProvider initialSession={session} initialUser={initialUser}>
            <I18nProvider locale={locale}>
              <ToastProvider>{children}</ToastProvider>
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
