"use client";

import { FilterX, Layers } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { ASSET_CLASSES, assetClassLabel, type AssetClass } from "@/components/charts/asset-class";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { humanizeEnum, pluralize } from "@/lib/format";

import { usePortfolio } from "../hooks";
import { FreshnessBanner } from "./freshness-banner";
import { PortfolioSummary, PortfolioSummarySkeleton } from "./portfolio-summary";
import { PositionsView } from "./positions-table";

const ALL = "all";

export function PortfolioTab({ customerId }: { customerId: string }) {
  const { data, isPending, isError, error, refetch, isRefetching } = usePortfolio(customerId);
  const searchParams = useSearchParams();
  const update = useSearchParamsUpdater();

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading portfolio">
        <Skeleton className="h-9 w-full max-w-md" />
        <PortfolioSummarySkeleton />
        <Card>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} />;

  // Filtering an already-loaded, per-customer list is presentation, so it happens client-side.
  const accountParam = searchParams.get("account");
  const classParam = searchParams.get("asset_class");
  const account = data.accounts.some((a) => a.account_id === accountParam) ? accountParam : null;
  const assetClass = (ASSET_CLASSES as readonly string[]).includes(classParam ?? "") ? (classParam as AssetClass) : null;
  const presentClasses = ASSET_CLASSES.filter((c) => data.positions.some((p) => p.asset_class === c));
  const positions = data.positions.filter(
    (p) => (!account || p.account_id === account) && (!assetClass || p.asset_class === assetClass),
  );
  const filtered = Boolean(account || assetClass);

  return (
    <div className="space-y-6">
      <FreshnessBanner freshness={data.freshness} />
      <PortfolioSummary portfolio={data} />

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>
            {filtered
              ? `${pluralize(positions.length, "position")} of ${data.positions.length} shown`
              : pluralize(data.positions.length, "position")}
          </CardDescription>
          {data.positions.length > 0 ? (
            <CardAction className="flex flex-wrap gap-2">
              <div className="space-y-1">
                <Label htmlFor="position-account" className="text-xs">Account</Label>
                <Select
                  value={account ?? ALL}
                  onValueChange={(v) => update({ account: v === ALL ? null : v }, { replace: true })}
                >
                  <SelectTrigger id="position-account" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All accounts</SelectItem>
                    {data.accounts.map((a) => (
                      <SelectItem key={a.account_id} value={a.account_id}>
                        {a.account_id} · {humanizeEnum(a.account_type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="position-class" className="text-xs">Asset class</Label>
                <Select
                  value={assetClass ?? ALL}
                  onValueChange={(v) => update({ asset_class: v === ALL ? null : v }, { replace: true })}
                >
                  <SelectTrigger id="position-class" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All classes</SelectItem>
                    {presentClasses.map((c) => (
                      <SelectItem key={c} value={c}>
                        {assetClassLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="px-0">
          {data.positions.length === 0 ? (
            <EmptyState
              className="mx-5"
              icon={Layers}
              title="No positions in the current snapshot"
              description="This customer holds no instruments as of the latest holdings snapshot."
            />
          ) : positions.length === 0 ? (
            <EmptyState
              className="mx-5"
              icon={FilterX}
              title="No positions match these filters"
              action={
                <Button variant="outline" size="sm" onClick={() => update({ account: null, asset_class: null }, { replace: true })}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <PositionsView
              positions={positions}
              showAccount={data.accounts.length > 1}
              snapshotPriceDate={data.freshness.price_as_of}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
