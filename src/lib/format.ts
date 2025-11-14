import { DEFAULT_CURRENCY, getCurrencyDecimals, getCurrencyLocale } from "@/config/currencies";

export function formatCurrency(minorUnits: number, currency = DEFAULT_CURRENCY) {
  const resolvedCurrency = currency ?? DEFAULT_CURRENCY;
  const decimals = getCurrencyDecimals(resolvedCurrency);
  const amount = minorUnits / 10 ** decimals;
  const locale = getCurrencyLocale(resolvedCurrency);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: resolvedCurrency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDate(value: string, locale = "id-ID", timeZone?: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: timeZone ?? undefined,
  }).format(new Date(value));
}
