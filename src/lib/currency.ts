import { DEFAULT_CURRENCY, getCurrencyDecimals, isSupportedCurrency } from "@/config/currencies";

const FRANKFURTER_ENDPOINT = "https://api.frankfurter.dev/latest";

export type RateMap = Map<string, number>;

type ParseOptions = {
  allowZero?: boolean;
};

export function normalizeCurrency(code: string | null | undefined): string {
  return code ? code.toUpperCase() : DEFAULT_CURRENCY;
}

export function parseAmountToMinor(
  value: FormDataEntryValue | null,
  currency: string,
  options: ParseOptions = {},
): number | null {
  const allowZero = options.allowZero ?? false;
  if (typeof value !== "string") {
    return allowZero ? 0 : null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return allowZero ? 0 : null;
  }

  const cleaned = trimmed.replace(/[^0-9,.-]/g, "");

  if (!cleaned) {
    return allowZero ? 0 : null;
  }

  let normalized = cleaned;
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    normalized = normalized.replace(/,/g, ".");
  }

  if (!/^[-]?\d*(?:\.\d*)?$/.test(normalized)) {
    return null;
  }

  const isNegative = normalized.startsWith("-");
  const unsigned = isNegative ? normalized.slice(1) : normalized;

  if (!/\d/.test(unsigned)) {
    return allowZero ? 0 : null;
  }

  if (!unsigned) {
    return allowZero ? 0 : null;
  }

  const [integerPartRaw, fractionPartRaw = ""] = unsigned.split(".");
  const decimals = getCurrencyDecimals(currency);
  const factor = BigInt(10) ** BigInt(decimals);

  let integerMinor = BigInt(integerPartRaw.length > 0 ? integerPartRaw : "0") * factor;
  let fractionalMinor = BigInt(0);

  if (decimals > 0) {
    const paddedFraction = (fractionPartRaw + "0".repeat(decimals + 1)).slice(0, decimals + 1);
    const truncated = paddedFraction.slice(0, decimals);
    const roundingDigit = paddedFraction[decimals] ?? "0";
    fractionalMinor = truncated ? BigInt(truncated) : BigInt(0);

    if (roundingDigit >= "5") {
      fractionalMinor += BigInt(1);
      if (fractionalMinor >= factor) {
        fractionalMinor -= factor;
        integerMinor += factor;
      }
    }
  } else if (fractionPartRaw.length > 0 && fractionPartRaw[0] >= "5") {
    integerMinor += BigInt(1);
  }

  let totalMinor = integerMinor + fractionalMinor;

  if (totalMinor === BigInt(0) && !allowZero) {
    return null;
  }

  if (isNegative) {
    totalMinor *= BigInt(-1);
  }

  const numeric = Number(totalMinor);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (!allowZero && numeric <= 0) {
    return null;
  }

  if (allowZero && numeric < 0) {
    return null;
  }

  return numeric;
}

export async function fetchRatesToIdr(codes: string[]): Promise<RateMap> {
  const rates: RateMap = new Map();
  rates.set(DEFAULT_CURRENCY, 1);

  const uniqueCodes = Array.from(new Set(codes.map((code) => normalizeCurrency(code))));
  const targets = uniqueCodes.filter((code) => code !== DEFAULT_CURRENCY && isSupportedCurrency(code));

  if (targets.length === 0) {
    return rates;
  }

  await Promise.all(
    targets.map(async (code) => {
      try {
        const url = `${FRANKFURTER_ENDPOINT}?base=${code}&symbols=${DEFAULT_CURRENCY}`;
        const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { rates?: Record<string, number> } | null;
        const rate = payload?.rates?.[DEFAULT_CURRENCY];
        if (typeof rate === "number" && Number.isFinite(rate)) {
          rates.set(code, rate);
        }
      } catch {
        // Swallow network errors; conversion will fall back to 1:1
      }
    }),
  );

  return rates;
}

export function convertMinorToIdr(amountMinor: number, currency: string, rates: RateMap): number {
  const normalizedCurrency = normalizeCurrency(currency);
  if (normalizedCurrency === DEFAULT_CURRENCY) {
    return amountMinor;
  }

  const rate = rates.get(normalizedCurrency);
  if (!rate || !Number.isFinite(rate)) {
    return amountMinor;
  }

  const sourceDecimals = getCurrencyDecimals(normalizedCurrency);
  const baseDecimals = getCurrencyDecimals(DEFAULT_CURRENCY);

  const majorAmount = amountMinor / 10 ** sourceDecimals;
  const convertedMajor = majorAmount * rate;
  const convertedMinor = Math.round(convertedMajor * 10 ** baseDecimals);
  return convertedMinor;
}
