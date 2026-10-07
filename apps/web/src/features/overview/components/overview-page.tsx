"use client";

import { AllocationBar } from "@/components/charts/allocation-bar";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/states/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

import { useOverview } from "../hooks";
import type { Headline } from "../types";
import { DataQualityCard } from "./data-quality-card";
import { HeroBand, HeroBandSkeleton } from "./hero-band";
import { NetFlowsCard } from "./net-flows-card";
import { TopCustomersCard } from "./top-customers-card";
import { TopInstrumentsCard } from "./top-instruments-card";
import { UnderfundedGoalsCard } from "./underfunded-goals-card";

function headerDescription(headline: Headline | undefined): string {
  if (!headline?.snapshot_date) return "Firm-wide book of customers, holdings and goals";
  const base = `Firm-wide book as of ${formatDate(headline.snapshot_date)}`;
  return headline.price_as_of && headline.price_as_of !== headline.snapshot_date
    ? `${base} · prices as of ${formatDate(headline.price_as_of)}`
    : base;
}

export function OverviewPage() {
  const { data, isPending, isError, error, refetch, isRefetching } = useOverview();

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description={headerDescription(data?.headline)} />

      {isPending ? (
        <OverviewSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} />
      ) : (
        <>
          <HeroBand headline={data.headline} allocation={data.allocation} />

          <Card>
            <CardHeader>
              <CardTitle>Asset allocation</CardTitle>
              <CardDescription>All customer holdings by asset class, at current prices</CardDescription>
            </CardHeader>
            <CardContent>
              {data.allocation.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No holdings in the current snapshot.</p>
              ) : (
                <AllocationBar data={data.allocation} />
              )}
            </CardContent>
          </Card>

          <div className="grid items-stretch gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <NetFlowsCard flows={data.monthly_net_flows} />
            </div>
            <div className="lg:col-span-4">
              <TopCustomersCard customers={data.top_customers} />
            </div>
          </div>

          <div className="grid items-stretch gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <UnderfundedGoalsCard goals={data.high_priority_underfunded_goals} />
            </div>
            <div className="lg:col-span-4">
              <DataQualityCard exceptions={data.data_quality} />
            </div>
          </div>

          <TopInstrumentsCard instruments={data.top_instruments_by_holders} />
        </>
      )}
    </div>
  );
}

function SkeletonCardHeader() {
  return (
    <CardHeader>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
      <HeroBandSkeleton />
      <Card>
        <SkeletonCardHeader />
        <CardContent className="space-y-5">
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
      {[0, 1].map((row) => (
        <div key={row} className="grid items-stretch gap-6 lg:grid-cols-12">
          <Card className="h-full lg:col-span-8">
            <SkeletonCardHeader />
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="h-full lg:col-span-4">
            <SkeletonCardHeader />
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
