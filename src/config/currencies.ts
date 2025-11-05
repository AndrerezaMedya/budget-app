export type CurrencyDefinition = {
  code: string;
  label: string;
  decimals: number;
  locale: string;
};

export const DEFAULT_CURRENCY = "IDR";

export const CURRENCY_DEFINITIONS: CurrencyDefinition[] = [
  {
    code: "IDR",
    label: "IDR — Indonesian Rupiah",
    decimals: 2,
    locale: "id-ID",
  },
  {
    code: "USD",
    label: "USD — United States Dollar",
    decimals: 2,
    locale: "en-US",
  },
  {
    code: "EUR",
    label: "EUR — Euro",
    decimals: 2,
    locale: "de-DE",
  },
  {
    code: "SGD",
    label: "SGD — Singapore Dollar",
    decimals: 2,
    locale: "en-SG",
  },
  {
    code: "MYR",
    label: "MYR — Malaysian Ringgit",
    decimals: 2,
    locale: "ms-MY",
  },
  {
    code: "JPY",
    label: "JPY — Japanese Yen",
    decimals: 0,
    locale: "ja-JP",
  },
  {
    code: "CNY",
    label: "CNY — Chinese Yuan",
    decimals: 2,
    locale: "zh-CN",
  },
];

export const SUPPORTED_CURRENCY_CODES = CURRENCY_DEFINITIONS.map((definition) => definition.code);

const DECIMALS_MAP = new Map(CURRENCY_DEFINITIONS.map((definition) => [definition.code, definition.decimals]));
const LOCALE_MAP = new Map(CURRENCY_DEFINITIONS.map((definition) => [definition.code, definition.locale]));
const LABEL_MAP = new Map(CURRENCY_DEFINITIONS.map((definition) => [definition.code, definition.label]));

export const ACCOUNT_CURRENCY_OPTIONS = CURRENCY_DEFINITIONS.map((definition) => ({
  value: definition.code,
  label: definition.label,
}));

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

export function isSupportedCurrency(code: string | null | undefined): code is SupportedCurrencyCode {
  if (!code) {
    return false;
  }
  return DECIMALS_MAP.has(code.toUpperCase());
}

export function getCurrencyDecimals(code: string): number {
  const resolved = DECIMALS_MAP.get(code.toUpperCase());
  return resolved ?? DECIMALS_MAP.get(DEFAULT_CURRENCY)!;
}

export function getCurrencyLocale(code: string): string {
  const resolved = LOCALE_MAP.get(code.toUpperCase());
  return resolved ?? LOCALE_MAP.get(DEFAULT_CURRENCY)!;
}

export function getCurrencyLabel(code: string): string {
  const resolved = LABEL_MAP.get(code.toUpperCase());
  return resolved ?? code.toUpperCase();
}
