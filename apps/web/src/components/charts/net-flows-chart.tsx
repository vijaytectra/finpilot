"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatInteger, formatMoney, formatMoneyCompact, formatMonth, formatMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FlowDatum {
  month: string;
  buy_amount: number;
  sell_amount: number;
  net_invested: number;
  trades: number;
}

function FlowTooltip({ active, payload }: { active?: boolean; payload?: { payload?: FlowDatum }[] }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="min-w-44 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium">{formatMonth(d.month)}</p>
      <dl className="tabular grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-muted-foreground">Buys</dt>
        <dd className="text-right">{formatMoney(d.buy_amount)}</dd>
        <dt className="text-muted-foreground">Sells</dt>
        <dd className="text-right">{formatMoney(d.sell_amount)}</dd>
        <dt className="font-medium">Net invested</dt>
        <dd className="text-right font-medium">{formatMoney(d.net_invested)}</dd>
        <dt className="text-muted-foreground">Trades</dt>
        <dd className="text-right">{formatInteger(d.trades)}</dd>
      </dl>
    </div>
  );
}

/** Single-series bar chart of monthly net invested (buys − sells, computed by the API). */
export function NetFlowsChart({ data, className }: { data: FlowDatum[]; className?: string }) {
  const label = `Monthly net invested, ${formatMonth(data[0]?.month)} to ${formatMonth(data.at(-1)?.month)}. See the table view for exact values.`;
  return (
    <div role="img" aria-label={label} className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={(v: string) => formatMonthShort(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyCompact(v)}
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
          <Tooltip content={<FlowTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey="net_invested" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.month}
                fill={d.net_invested < 0 ? "var(--negative)" : "var(--primary)"}
                fillOpacity={d.net_invested < 0 ? 1 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
