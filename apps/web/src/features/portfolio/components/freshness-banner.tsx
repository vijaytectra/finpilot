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

  if (freshness.stale_prices) {
    return (
      <Alert className="border-warning/40 bg-warning-muted/60">
        <TriangleAlert aria-hidden className="text-warning" />
        <AlertTitle>Some prices are older than the snapshot</AlertTitle>
        <AlertDescription>
          <p>{line}</p>
          <p>
            Oldest price used: {formatDate(freshness.oldest_price_as_of)}. Values for those positions may be out of date.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <p className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
      <CalendarClock className="size-4 shrink-0" aria-hidden />
      <span>{line}</span>
    </p>
  );
}
