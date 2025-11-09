"use client";

import { useMemo } from "react";
import {
<<<<<<< Updated upstream
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
=======
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
>>>>>>> Stashed changes
} from "recharts";
import type { TooltipProps } from "recharts";

import { DEFAULT_CURRENCY, getCurrencyDecimals } from "@/config/currencies";
import { formatCurrency } from "@/lib/format";

type CategoryDatum = {
<<<<<<< Updated upstream
  name: string;
  amountMinor: number;
};

type CategorySpendDonutProps = {
  data: CategoryDatum[];
  locale: string;
  currency?: string;
  totalLabel: string;
};

type ChartDatum = {
  name: string;
  amountMinor: number;
  value: number;
  fill: string;
  share: number;
};

type ChartTooltipProps = TooltipProps<number, string> & {
  payload?: Array<{
    payload: ChartDatum;
  }>;
};

const COLOR_PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))",
];

export function CategorySpendDonut({
  data,
  locale,
  currency = DEFAULT_CURRENCY,
  totalLabel,
}: CategorySpendDonutProps) {
  const decimals = getCurrencyDecimals(currency);
  const divisor = 10 ** decimals;

  const totalMinor = useMemo(
    () => data.reduce((accumulator, entry) => accumulator + entry.amountMinor, 0),
    [data],
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    [locale],
  );

  const formattedData = useMemo<ChartDatum[]>(() => {
    if (totalMinor === 0) {
      return [];
    }

    return data.map((entry, index) => {
      const value = entry.amountMinor / divisor;
      const share = entry.amountMinor > 0 ? entry.amountMinor / totalMinor : 0;
      return {
        name: entry.name,
        amountMinor: entry.amountMinor,
        value,
        fill: COLOR_PALETTE[index % COLOR_PALETTE.length],
        share,
      } satisfies ChartDatum;
    });
  }, [data, divisor, totalMinor]);

  const tooltip = useMemo(
    () =>
      function CustomTooltip(props: ChartTooltipProps) {
        const datum = props.payload?.[0]?.payload;
        if (!props.active || !datum) {
          return null;
        }

        return (
          <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
            <p className="font-medium text-foreground">{datum.name}</p>
            <div className="mt-2 flex items-center justify-between gap-6">
              <span className="text-muted-foreground">{percentFormatter.format(datum.share)}</span>
              <span className="font-medium text-foreground">
                {formatCurrency(datum.amountMinor, currency)}
              </span>
            </div>
          </div>
        );
      },
    [currency, percentFormatter],
  );

  return (
    <div className="grid h-full gap-4 md:grid-cols-[minmax(0,220px)_1fr] md:items-start">
      <div className="min-w-0">
        <div className="h-[200px] md:h-[240px] lg:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={formattedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={tooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex flex-col text-xs">
        <p className="font-medium text-muted-foreground">{totalLabel}</p>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto md:pr-1">
          {formattedData.map((entry, index) => (
            <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="font-medium text-foreground">{entry.name}</span>
              </div>
              <div className="text-right text-muted-foreground">
                <p>{formatCurrency(entry.amountMinor, currency)}</p>
                <p>{percentFormatter.format(entry.share)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
=======
    name: string;
    amountMinor: number;
};

type CategorySpendDonutProps = {
    data: CategoryDatum[];
    locale: string;
    currency?: string;
    totalLabel: string;
};

type ChartDatum = {
    name: string;
    amountMinor: number;
    value: number;
    fill: string;
    share: number;
};

type ChartTooltipProps = TooltipProps<number, string> & {
    payload?: Array<{
        payload: ChartDatum;
    }>;
};

const COLOR_PALETTE = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(var(--muted-foreground))",
    "hsl(var(--destructive))",
    "hsl(var(--muted))",
];

export function CategorySpendDonut({
    data,
    locale,
    currency = DEFAULT_CURRENCY,
    totalLabel,
}: CategorySpendDonutProps) {
    const decimals = getCurrencyDecimals(currency);
    const divisor = 10 ** decimals;

    const totalMinor = useMemo(
        () => data.reduce((accumulator, entry) => accumulator + entry.amountMinor, 0),
        [data],
    );

    const percentFormatter = useMemo(
        () =>
            new Intl.NumberFormat(locale, {
                style: "percent",
                maximumFractionDigits: 1,
            }),
        [locale],
    );

    const formattedData = useMemo<ChartDatum[]>(() => {
        if (totalMinor === 0) {
            return [];
        }

        return data.map((entry, index) => {
            const value = entry.amountMinor / divisor;
            const share = entry.amountMinor > 0 ? entry.amountMinor / totalMinor : 0;
            return {
                name: entry.name,
                amountMinor: entry.amountMinor,
                value,
                fill: COLOR_PALETTE[index % COLOR_PALETTE.length],
                share,
            } satisfies ChartDatum;
        });
    }, [data, divisor, totalMinor]);

    const tooltip = useMemo(
        () =>
            function CustomTooltip(props: ChartTooltipProps) {
                const datum = props.payload?.[0]?.payload;
                if (!props.active || !datum) {
                    return null;
                }

                return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
                        <p className="font-medium text-foreground">{datum.name}</p>
                        <div className="mt-2 flex items-center justify-between gap-6">
                            <span className="text-muted-foreground">{percentFormatter.format(datum.share)}</span>
                            <span className="font-medium text-foreground">
                                {formatCurrency(datum.amountMinor, currency)}
                            </span>
                        </div>
                    </div>
                );
            },
        [currency, percentFormatter],
    );

    return (
        <div className="grid h-full gap-4 md:grid-cols-[minmax(0,220px)_1fr] md:items-start">
            <div className="min-w-0">
                <div className="h-[200px] md:h-[240px] lg:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={formattedData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={90}
                                paddingAngle={2}
                            >
                                {formattedData.map((entry, index) => (
                                    <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={tooltip} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="flex flex-col text-xs">
                <p className="font-medium text-muted-foreground">{totalLabel}</p>
                <div className="mt-3 flex-1 space-y-2 overflow-y-auto md:pr-1">
                    {formattedData.map((entry, index) => (
                        <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span
                                    className="inline-block size-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: entry.fill }}
                                />
                                <span className="font-medium text-foreground">{entry.name}</span>
                            </div>
                            <div className="text-right text-muted-foreground">
                                <p>{formatCurrency(entry.amountMinor, currency)}</p>
                                <p>{percentFormatter.format(entry.share)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
>>>>>>> Stashed changes
}
