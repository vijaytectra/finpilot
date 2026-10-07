import type { AllocationDatum } from "@/components/charts/allocation-chart";
import { ASSET_CLASS_COLOR, assetClassLabel } from "@/components/charts/asset-class";
import { StatStrip } from "@/components/stat-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInteger, formatMoney, formatMoneyCompact, formatPercent } from "@/lib/format";

import type { Headline } from "../types";

/** The one number that matters (AUM) at hero size; book-size figures as secondary stats beneath it. */
export function HeroBand({ headline, allocation = [] }: { headline: Headline; allocation?: AllocationDatum[] }) {
  const largest = allocation.reduce<AllocationDatum | undefined>(
    (top, d) => (top === undefined || d.weight_pct > top.weight_pct ? d : top),
    undefined,
  );
  return (
    <section aria-label="Headline figures" className="rounded-[10px] border bg-card shadow-card">
      <div className="flex flex-col gap-4 px-5 pt-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">Assets under management</p>
          <p className="tabular mt-1 text-[40px] leading-none font-semibold tracking-[-0.02em]" title={formatMoney(headline.aum)}>
            {formatMoneyCompact(headline.aum)}
          </p>
          <p className="tabular mt-2 text-[13px] text-muted-foreground">{formatMoney(headline.aum)}</p>
        </div>
        {largest ? (
          <div className="min-w-0 sm:text-right">
            <p className="text-[13px] text-muted-foreground">Largest asset class</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium sm:justify-end">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: ASSET_CLASS_COLOR[largest.asset_class] }} aria-hidden />
              {assetClassLabel(largest.asset_class)}
              <span className="tabular font-semibold">{formatPercent(largest.weight_pct)}</span>
            </p>
            <p className="tabular mt-0.5 text-xs text-muted-foreground" title={formatMoney(largest.market_value)}>
              {formatMoneyCompact(largest.market_value)} of the book
            </p>
          </div>
        ) : null}
      </div>
      <div className="border-t">
        <StatStrip
          bare
          label="Book size"
          items={[
            {
              label: "Customers",
              value: formatInteger(headline.customers),
              hint: `${formatInteger(headline.customers_with_holdings)} with holdings`,
            },
            { label: "Accounts", value: formatInteger(headline.accounts), hint: `${formatInteger(headline.active_accounts)} active` },
            { label: "Transactions", value: formatInteger(headline.transactions), hint: "All time, all statuses" },
            { label: "Goals", value: formatInteger(headline.goals), hint: "Across all customers" },
          ]}
        />
      </div>
    </section>
  );
}

export function HeroBandSkeleton() {
  return (
    <div className="space-y-3 rounded-[10px] border bg-card p-5" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}
