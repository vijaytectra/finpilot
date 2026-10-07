"use client";

import { AllocationChart } from "@/components/charts/allocation-chart";
import { ErrorState } from "@/components/states/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalSummaryCard } from "@/features/goals/components/goal-summary-card";
import { AccountCards } from "@/features/portfolio/components/account-cards";
import { PortfolioSummary, PortfolioSummarySkeleton } from "@/features/portfolio/components/portfolio-summary";
import { usePortfolio } from "@/features/portfolio/hooks";
import { RecentTransactionsCard } from "@/features/transactions/components/recent-transactions-card";
import { formatDate } from "@/lib/format";

import { useCustomer } from "../hooks";
import { RiskProfileCard, RiskProfileCardSkeleton } from "./risk-profile-card";

/** Each section owns its query, so one failing endpoint never blanks the whole tab. */
export function CustomerOverviewTab({ customerId }: { customerId: string }) {
  const customer = useCustomer(customerId);
  const portfolio = usePortfolio(customerId);

  return (
    <div className="space-y-6">
      {portfolio.isPending ? (
        <PortfolioSummarySkeleton />
      ) : portfolio.isError ? (
        <ErrorState
          error={portfolio.error}
          onRetry={() => void portfolio.refetch()}
          isRetrying={portfolio.isRefetching}
          title="We couldn't load the portfolio"
          compact
        />
      ) : (
        <PortfolioSummary portfolio={portfolio.data} />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Allocation</CardTitle>
              <CardDescription>
                {portfolio.data?.freshness.snapshot_date
                  ? `Holdings as of ${formatDate(portfolio.data.freshness.snapshot_date)}`
                  : "Holdings by asset class"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portfolio.isPending ? (
                <div className="grid items-center gap-6 md:grid-cols-[200px_1fr] lg:grid-cols-1 xl:grid-cols-[200px_1fr]" aria-hidden>
                  <Skeleton className="mx-auto size-[180px] rounded-full" />
                  <div className="space-y-3">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} className="h-5 w-full" />
                    ))}
                  </div>
                </div>
              ) : portfolio.isError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Allocation unavailable.</p>
              ) : portfolio.data.allocation.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No holdings in the current snapshot.</p>
              ) : (
                <AllocationChart
                  data={portfolio.data.allocation}
                  total={portfolio.data.totals.market_value}
                  totalLabel="Market value"
                />
              )}
            </CardContent>
          </Card>

          <section aria-labelledby="accounts-heading" className="space-y-3">
            <h2 id="accounts-heading" className="text-sm font-semibold">
              Accounts
            </h2>
            {portfolio.isPending ? (
              <div className="grid gap-3 md:grid-cols-2" aria-hidden>
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
              </div>
            ) : portfolio.isError ? (
              <p className="text-sm text-muted-foreground">Accounts unavailable.</p>
            ) : (
              <AccountCards accounts={portfolio.data.accounts} />
            )}
          </section>

          <RecentTransactionsCard customerId={customerId} />
        </div>

        <div className="space-y-6">
          {customer.isPending ? (
            <RiskProfileCardSkeleton />
          ) : customer.isError ? null : (
            <RiskProfileCard profile={customer.data.risk_profile} />
          )}
          <GoalSummaryCard customerId={customerId} />
        </div>
      </div>
    </div>
  );
}
