import type { Database } from "@/types/supabase";

type AccountType = Database["public"]["Enums"]["account_type"];

type AccountTypeOption = {
  value: AccountType;
  label: string;
};

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { value: "bank", label: "Bank account" },
  { value: "cash", label: "Cash wallet" },
  { value: "wallet", label: "Digital wallet" },
  { value: "credit", label: "Credit account" },
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings account" },
  { value: "other", label: "Other" },
];

export const ACCOUNT_TYPE_VALUES: AccountType[] = ACCOUNT_TYPE_OPTIONS.map(
  (option) => option.value,
);
