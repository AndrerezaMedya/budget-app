import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Workspace · dY Personal Finance Tracker",
  description:
    "Manage transactions, budgets, and reports in the dY Personal Finance workspace.",
};

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return <AppShell>{children}</AppShell>;
}
