import { MapPin } from "lucide-react";
import Link from "next/link";

import { formatInteger, formatMoney, formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { CustomerListItem } from "../types";
import { KycBadge, SegmentBadge } from "./customer-badges";

/** Mobile list (< md): one tappable card per customer. */
export function CustomerCards({ customers, isFetching }: { customers: CustomerListItem[]; isFetching?: boolean }) {
  return (
    <ul className={cn("space-y-2 transition-opacity", isFetching && "opacity-60")}>
      {customers.map((c) => (
        <li key={c.customer_id}>
          <Link
            href={`/customers/${c.customer_id}`}
            className="block rounded-lg border bg-card p-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.customer_id}</p>
              </div>
              <div className="text-right">
                <p className="tabular font-semibold" title={formatMoney(c.aum)}>
                  {formatMoneyCompact(c.aum)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatInteger(c.accounts)} {c.accounts === 1 ? "account" : "accounts"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <KycBadge status={c.kyc_status} />
              <SegmentBadge segment={c.segment} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden />
                {c.city}, {c.state}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
