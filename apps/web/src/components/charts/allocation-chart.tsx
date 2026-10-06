"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger, formatMoney, formatMoneyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ASSET_CLASS_COLOR, assetClassLabel, type AssetClass } from "./asset-class";

export interface AllocationDatum {
  asset_class: AssetClass;
  market_value: number;
  weight_pct: number;
  positions?: number;
}

interface AllocationChartProps {
  data: AllocationDatum[];
  /** Total shown in the donut hole (already computed by the API). */
  total?: number;
  totalLabel?: string;
  className?: string;
}

interface TooltipPayload {
  payload?: AllocationDatum;
}

function AllocationTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="flex items-center gap-1.5 font-medium">
        <span className="size-2 rounded-full" style={{ background: ASSET_CLASS_COLOR[datum.asset_class] }} aria-hidden />
        {assetClassLabel(datum.asset_class)}
      </p>
      <p className="tabular mt-1 text-muted-foreground">
        {formatMoney(datum.market_value)} · {formatPercent(datum.weight_pct)}
      </p>
    </div>
  );
}

/**
 * Donut + always-visible data table. The chart is an `img` with a text summary; the
 * table is the accessible (and precise) representation.
 */
export function AllocationChart({ data, total, totalLabel = "Total", className }: AllocationChartProps) {
  const summary = data.map((d) => `${assetClassLabel(d.asset_class)} ${formatPercent(d.weight_pct)}`).join(", ");
  const showPositions = data.some((d) => d.positions !== undefined);

  return (
    <div className={cn("grid items-center gap-6 md:grid-cols-[200px_1fr] lg:grid-cols-1 xl:grid-cols-[200px_1fr]", className)}>
      <div className="relative mx-auto size-[200px]" role="img" aria-label={`Asset allocation: ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="market_value"
              nameKey="asset_class"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={data.length > 1 ? 1.5 : 0}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.asset_class} fill={ASSET_CLASS_COLOR[d.asset_class]} />
              ))}
            </Pie>
            <Tooltip content={<AllocationTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {total !== undefined ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-muted-foreground">{totalLabel}</span>
            <span className="tabular text-base font-semibold" title={formatMoney(total)}>
              {formatMoneyCompact(total)}
            </span>
          </div>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset class</TableHead>
            {showPositions ? <TableHead className="text-right">Positions</TableHead> : null}
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.asset_class}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: ASSET_CLASS_COLOR[d.asset_class] }} aria-hidden />
                  {assetClassLabel(d.asset_class)}
                </span>
              </TableCell>
              {showPositions ? <TableCell className="tabular text-right">{formatInteger(d.positions)}</TableCell> : null}
              <TableCell className="tabular text-right">{formatMoney(d.market_value)}</TableCell>
              <TableCell className="tabular text-right">{formatPercent(d.weight_pct)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {total !== undefined ? (
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">{totalLabel}</TableCell>
              {showPositions ? (
                <TableCell className="tabular text-right">
                  {formatInteger(data.reduce((n, d) => n + (d.positions ?? 0), 0))}
                </TableCell>
              ) : null}
              <TableCell className="tabular text-right font-medium">{formatMoney(total)}</TableCell>
              <TableCell className="text-right text-muted-foreground">100%</TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}
