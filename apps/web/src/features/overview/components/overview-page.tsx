"use client";

import { AllocationChart } from "@/components/charts/allocation-chart";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/states/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

import { useOverview } from "../hooks";
import { DataQualityCard } from "./data-quality-card";
import { HeadlineCards, HeadlineCardsSkeleton } from "./headline-cards";
import { NetFlowsCard } from "./net-flows-card";
import { TopCustomersCard } from "./top-customers-card";
import { TopInstrumentsCard } from "./top-instruments-card";
import { UnderfundedGoalsCard } from "./underfunded-goals-card";

export function OverviewPage() {
  const { data, isPending, isError, error, refetch, isRefetching } = useOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={
          data?.headline.snapshot_date
            ? `Firm-wide book as of ${formatDate(data.headline.snapshot_date)}`
            : "Firm-wide book of customers, holdings and goals"
        }
      />

      {isPending ? (
        <OverviewSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} />
      ) : (
        <>
          <HeadlineCards headline={data.headline} />

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Asset allocation</CardTitle>
                <CardDescription>All customer holdings by asset class, at current prices</CardDescription>
              </CardHeader>
              <CardContent>
                {data.allocation.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No holdings in the current snapshot.</p>
                ) : (
                  <AllocationChart data={data.allocation} total={data.headline.aum} totalLabel="Total AUM" />
                )}
              </CardContent>
            </Card>
            <TopCustomersCard customers={data.top_customers} />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NetFlowsCard flows={data.monthly_net_flows} />
            </div>
            <TopInstrumentsCard instruments={data.top_instruments_by_holders} />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <UnderfundedGoalsCard goals={data.high_priority_underfunded_goals} />
            </div>
            <DataQualityCard exceptions={data.data_quality} />
          </div>
        </>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
      <HeadlineCardsSkeleton />
      {[0, 1].map((row) => (
        <div key={row} className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="grid items-center gap-6 md:grid-cols-[200px_1fr]">
              <Skeleton className="mx-auto size-[180px] rounded-full" />
              <div className="space-y-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
