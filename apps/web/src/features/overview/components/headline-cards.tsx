import { ArrowLeftRight, CalendarClock, Landmark, Target, Users, Wallet } from "lucide-react";

import { StatCard, StatCardSkeleton } from "@/components/stat-card";
import { formatDate, formatInteger, formatMoney, formatMoneyCompact } from "@/lib/format";

import type { Headline } from "../types";

export function HeadlineCards({ headline }: { headline: Headline }) {
  const pricesDiffer = headline.price_as_of && headline.price_as_of !== headline.snapshot_date;
  return (
    <section aria-label="Headline figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Customers"
        icon={Users}
        value={formatInteger(headline.customers)}
        hint={`${formatInteger(headline.customers_with_holdings)} with holdings`}
      />
      <StatCard
        label="Accounts"
        icon={Landmark}
        value={formatInteger(headline.accounts)}
        hint={`${formatInteger(headline.active_accounts)} active`}
      />
      <StatCard
        label="Assets under mgmt"
        icon={Wallet}
        value={formatMoneyCompact(headline.aum)}
        title={formatMoney(headline.aum)}
        hint={formatMoney(headline.aum)}
      />
      <StatCard label="Transactions" icon={ArrowLeftRight} value={formatInteger(headline.transactions)} hint="All time, all statuses" />
      <StatCard label="Goals" icon={Target} value={formatInteger(headline.goals)} hint="Across all customers" />
      <StatCard
        label="Data as of"
        icon={CalendarClock}
        value={<span className="text-lg sm:text-xl">{formatDate(headline.snapshot_date)}</span>}
        hint={pricesDiffer ? `Prices as of ${formatDate(headline.price_as_of)}` : "Holdings snapshot & prices"}
      />
    </section>
  );
}

export function HeadlineCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
