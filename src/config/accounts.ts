import type { Database } from "@/types/supabase";
import type { TranslationKey } from "@/i18n/translations";

type AccountType = Database["public"]["Enums"]["account_type"];

type AccountTypeOption = {
  value: AccountType;
  labelKey: TranslationKey;
};

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { value: "bank", labelKey: "accounts.type.bank" },
  { value: "cash", labelKey: "accounts.type.cash" },
  { value: "wallet", labelKey: "accounts.type.wallet" },
  { value: "credit", labelKey: "accounts.type.credit" },
  { value: "investment", labelKey: "accounts.type.investment" },
  { value: "savings", labelKey: "accounts.type.savings" },
  { value: "other", labelKey: "accounts.type.other" },
];

export const ACCOUNT_TYPE_VALUES: AccountType[] = ACCOUNT_TYPE_OPTIONS.map(
  (option) => option.value,
);

export const ACCOUNT_TYPE_LABEL_MAP: Record<AccountType, TranslationKey> =
  ACCOUNT_TYPE_OPTIONS.reduce((acc, option) => {
    acc[option.value] = option.labelKey;
    return acc;
  }, {} as Record<AccountType, TranslationKey>);
