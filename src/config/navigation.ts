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

import type { TranslationKey } from "@/i18n/translations";

export type AppRoute = {
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  href: string;
  icon: LucideIcon;
};

export const APP_ROUTES: AppRoute[] = [
  {
    labelKey: "nav.overview.label",
    descriptionKey: "nav.overview.description",
    href: "/app/overview",
    icon: LayoutDashboard,
  },
  {
    labelKey: "nav.transactions.label",
    descriptionKey: "nav.transactions.description",
    href: "/app/transactions",
    icon: CreditCard,
  },
  {
    labelKey: "nav.accounts.label",
    descriptionKey: "nav.accounts.description",
    href: "/app/accounts",
    icon: Wallet,
  },
  {
    labelKey: "nav.budgets.label",
    descriptionKey: "nav.budgets.description",
    href: "/app/budgets",
    icon: ChartNoAxesCombined,
  },
  {
    labelKey: "nav.reports.label",
    descriptionKey: "nav.reports.description",
    href: "/app/reports",
    icon: LineChart,
  },
  {
    labelKey: "nav.imports.label",
    descriptionKey: "nav.imports.description",
    href: "/app/imports",
    icon: FileSpreadsheet,
  },
  {
    labelKey: "nav.settings.label",
    descriptionKey: "nav.settings.description",
    href: "/app/settings",
    icon: Settings,
  },
];
