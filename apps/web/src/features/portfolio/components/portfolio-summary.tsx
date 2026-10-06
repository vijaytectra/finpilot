import { Landmark, PiggyBank, TrendingUp, Wallet } from "lucide-react";

import { Pnl } from "@/components/pnl";
import { StatCard, StatCardSkeleton } from "@/components/stat-card";
import { formatInteger, formatMoney, formatMoneyCompact, formatSignedMoney, pluralize } from "@/lib/format";

import type { Portfolio } from "../types";

export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const { totals, accounts } = portfolio;
  const active = accounts.filter((a) => a.status === "ACTIVE").length;
  return (
    <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Market value"
        icon={Wallet}
        value={formatMoneyCompact(totals.market_value)}
        title={formatMoney(totals.market_value)}
        hint={formatMoney(totals.market_value)}
      />
      <StatCard
        label="Invested"
        icon={PiggyBank}
        value={formatMoneyCompact(totals.cost_basis)}
        title={formatMoney(totals.cost_basis)}
        hint="Cost basis of current holdings"
      />
      <StatCard
        label="Unrealised P/L"
        icon={TrendingUp}
        value={<Pnl amount={totals.unrealized_pnl} compact iconClassName="size-5" />}
        title={formatSignedMoney(totals.unrealized_pnl)}
        hint={<Pnl amount={totals.unrealized_pnl} percent={totals.unrealized_pnl_pct} className="text-xs" iconClassName="size-3" />}
      />
      <StatCard
        label="Accounts"
        icon={Landmark}
        value={formatInteger(accounts.length)}
        hint={`${formatInteger(active)} active · ${pluralize(totals.positions, "position")}`}
      />
    </section>
  );
}

export function PortfolioSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
