import type { LucideIcon } from "lucide-react";
import {
  ChartNoAxesCombined,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  LineChart,
  Settings,
  Wallet,
} from "lucide-react";

export type AppRoute = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const APP_ROUTES: AppRoute[] = [
  {
    label: "Overview",
    description: "Cashflow, budgets, and balances at a glance.",
    href: "/app/overview",
    icon: LayoutDashboard,
  },
  {
    label: "Transactions",
    description: "Search, filter, and edit ledger entries.",
    href: "/app/transactions",
    icon: CreditCard,
  },
  {
    label: "Accounts",
    description: "Manage accounts, opening balances, and transfers.",
    href: "/app/accounts",
    icon: Wallet,
  },
  {
    label: "Budgets",
    description: "Monthly category budgets with burn rate.",
    href: "/app/budgets",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Reports",
    description: "Charts for expense trends and balance history.",
    href: "/app/reports",
    icon: LineChart,
  },
  {
    label: "Imports",
    description: "CSV import wizard and export options.",
    href: "/app/imports",
    icon: FileSpreadsheet,
  },
  {
    label: "Settings",
    description: "Workspace preferences and integrations.",
    href: "/app/settings",
    icon: Settings,
  },
];
