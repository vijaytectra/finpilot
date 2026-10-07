import { CalendarClock, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";

import type { DataFreshness } from "../types";

/** "Snapshot 18 Sep 2026 · Prices as of 18 Sep 2026", escalated to a warning when prices are stale. */
export function FreshnessBanner({ freshness }: { freshness: DataFreshness }) {
  if (!freshness.snapshot_date) {
    return (
      <Alert>
        <CalendarClock aria-hidden />
        <AlertTitle>No holdings snapshot loaded</AlertTitle>
        <AlertDescription>Positions appear once a holdings snapshot has been imported.</AlertDescription>
      </Alert>
    );
  }

  const line = (
    <>
      Snapshot <strong className="font-medium text-foreground">{formatDate(freshness.snapshot_date)}</strong> · Prices
      as of <strong className="font-medium text-foreground">{formatDate(freshness.price_as_of)}</strong>
    </>
  );

  const rowClass = "flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground";

  if (freshness.stale_prices) {
    return (
      <div className={rowClass}>
        <TriangleAlert className="size-3.5 shrink-0 text-warning" aria-hidden />
        <span className="font-medium text-warning">Some prices are older than the snapshot</span>
        <span>{line}</span>
        <span>
          Oldest price used: {formatDate(freshness.oldest_price_as_of)}. Values for those positions may be out of date.
        </span>
      </div>
    );
  }

  return (
    <p className={rowClass}>
      <CalendarClock className="size-3.5 shrink-0" aria-hidden />
      <span>{line}</span>
    </p>
  );
}
