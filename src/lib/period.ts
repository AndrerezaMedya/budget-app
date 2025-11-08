export type PeriodRange = {
  periodStart: Date;
  periodEnd: Date;
};

export function getCurrentPeriodKey(baseDate = new Date()): string {
  const month = `${baseDate.getMonth() + 1}`.padStart(2, "0");
  return `${baseDate.getFullYear()}-${month}`;
}

export function parsePeriodKey(periodKey: string | undefined): { year: number; month: number } | null {
  if (!periodKey) return null;

  const [yearPart, monthPart] = periodKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }

  return { year, month };
}

export function getPeriodRange(periodKey: string | undefined): PeriodRange | null {
  const parsed = parsePeriodKey(periodKey);
  if (!parsed) return null;

  const periodStart = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  return { periodStart, periodEnd };
}

export function formatPeriodLabel(periodKey: string, locale: string): string {
  const parsed = parsePeriodKey(periodKey);
  if (!parsed) return periodKey;

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function shiftPeriodKey(periodKey: string, offsetMonths: number): string {
  const parsed = parsePeriodKey(periodKey);
  if (!parsed) {
    return getCurrentPeriodKey();
  }

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  return getCurrentPeriodKey(date);
}

export function getPeriodKeyFromDate(date: Date): string {
  return getCurrentPeriodKey(date);
}
