"use client";

import { useMemo } from "react";
import type { TooltipProps } from "recharts";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DEFAULT_CURRENCY, getCurrencyDecimals } from "@/config/currencies";
import { formatCurrency } from "@/lib/format";
import type { DailyCashflowPoint } from "@/lib/supabase/queries/transactions";

type ChartDatum = {
  label: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  income: number;
  expense: number;
  net: number;
};

type LabelConfig = {
  income: string;
  expense: string;
  net: string;
};

type SpendingTrendChartProps = {
  data: DailyCashflowPoint[];
  locale: string;
  currency?: string;
  labels: LabelConfig;
};

type ChartTooltipProps = TooltipProps<number, string> & {
  payload?: Array<{
    value: number;
    dataKey: keyof ChartDatum;
    payload: ChartDatum;
  }>;
};

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function SpendingTrendChart({
  data,
  locale,
  currency = DEFAULT_CURRENCY,
  labels,
}: SpendingTrendChartProps) {
  const decimals = getCurrencyDecimals(currency);
  const divisor = 10 ** decimals;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const compactFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale],
  );

  const chartData = useMemo<ChartDatum[]>(
    () =>
      data.map((point) => {
        const date = toUtcDate(point.date);
        return {
          label: dateFormatter.format(date),
          incomeMinor: point.incomeMinor,
          expenseMinor: point.expenseMinor,
          netMinor: point.netMinor,
          income: point.incomeMinor / divisor,
          expense: point.expenseMinor / divisor,
          net: point.netMinor / divisor,
        } satisfies ChartDatum;
      }),
    [data, dateFormatter, divisor],
  );

  const tooltip = useMemo(
    () =>
      function CustomTooltip(props: ChartTooltipProps) {
        if (!props.active || !props.payload || props.payload.length === 0) {
          return null;
        }

        const datum = props.payload[0]?.payload ?? null;
        if (!datum) {
          return null;
        }

        return (
          <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
            <p className="font-medium text-foreground">{datum.label}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between gap-6">
                <span className="text-muted-foreground">{labels.income}</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(datum.incomeMinor, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-muted-foreground">{labels.expense}</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(datum.expenseMinor, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-muted-foreground">{labels.net}</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(datum.netMinor, currency)}
                </span>
              </div>
            </div>
          </div>
        );
      },
    [currency, labels],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(value) => compactFormatter.format(value as number)}
        />
        <Tooltip content={tooltip} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="income"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary) / 0.12)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expense"
          stroke="hsl(var(--destructive))"
          fill="hsl(var(--destructive) / 0.12)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="net"
          stroke="hsl(var(--accent))"
          fill="hsl(var(--accent) / 0.12)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
