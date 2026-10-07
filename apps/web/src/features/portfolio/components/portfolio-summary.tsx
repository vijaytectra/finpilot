import { Pnl } from "@/components/pnl";
import { StatStrip } from "@/components/stat-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInteger, formatMoney, formatMoneyCompact, formatSignedMoney, pluralize } from "@/lib/format";

import type { Portfolio } from "../types";

export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const { totals, accounts } = portfolio;
  const active = accounts.filter((a) => a.status === "ACTIVE").length;
  return (
    <StatStrip
      label="Portfolio summary"
      items={[
        {
          label: "Market value",
          value: formatMoneyCompact(totals.market_value),
          title: formatMoney(totals.market_value),
          hint: formatMoney(totals.market_value),
        },
        {
          label: "Invested",
          value: formatMoneyCompact(totals.cost_basis),
          title: formatMoney(totals.cost_basis),
          hint: "Cost basis of current holdings",
        },
        {
          label: "Unrealised P/L",
          value: <Pnl amount={totals.unrealized_pnl} compact iconClassName="size-4" />,
          title: formatSignedMoney(totals.unrealized_pnl),
          hint: (
            <Pnl amount={totals.unrealized_pnl} percent={totals.unrealized_pnl_pct} className="text-xs" iconClassName="size-3" />
          ),
        },
        {
          label: "Accounts",
          value: formatInteger(accounts.length),
          hint: `${formatInteger(active)} active · ${pluralize(totals.positions, "position")}`,
        },
      ]}
    />
  );
}

export function PortfolioSummarySkeleton() {
  return (
    <div className="rounded-[10px] border bg-card shadow-card" aria-hidden>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 px-5 py-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
