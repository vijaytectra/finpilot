import { formatMoney, formatMoneyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { AllocationDatum } from "./allocation-chart";
import { ASSET_CLASS_COLOR, assetClassLabel } from "./asset-class";

/** One stacked horizontal bar plus a legend grid: a better fit than a donut for 2–6 shares of a whole. */
export function AllocationBar({ data, className }: { data: AllocationDatum[]; className?: string }) {
  const summary = data.map((d) => `${assetClassLabel(d.asset_class)} ${formatPercent(d.weight_pct)}`).join(", ");
  return (
    <div className={cn("space-y-5", className)}>
      <div role="img" aria-label={`Asset allocation: ${summary}`} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {data.map((d) => (
          <span
            key={d.asset_class}
            data-segment
            className="h-full min-w-[2px] first:rounded-l-full last:rounded-r-full"
            style={{ width: `${d.weight_pct}%`, background: ASSET_CLASS_COLOR[d.asset_class] }}
          />
        ))}
      </div>
      <ul aria-label="Allocation by asset class" className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
        {data.map((d) => (
          <li key={d.asset_class} className="min-w-0">
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: ASSET_CLASS_COLOR[d.asset_class] }} aria-hidden />
              {assetClassLabel(d.asset_class)}
            </span>
            <span className="tabular mt-0.5 block text-base font-semibold">{formatPercent(d.weight_pct)}</span>
            <span className="tabular block text-xs text-muted-foreground" title={formatMoney(d.market_value)}>
              {formatMoneyCompact(d.market_value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
