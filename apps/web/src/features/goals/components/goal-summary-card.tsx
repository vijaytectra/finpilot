"use client";

import { AlertTriangle, Target } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatMoneyCompact, formatPercent, pluralize } from "@/lib/format";

import { useGoals } from "../hooks";

export function GoalSummaryCard({ customerId }: { customerId: string }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useGoals(customerId);
  const href = `/customers/${customerId}/goals`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
        <CardDescription>{data ? pluralize(data.summary.goals, "goal") : "Funding progress"}</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>Manage</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3" aria-hidden>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} compact />
        ) : data.summary.goals === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center text-sm text-muted-foreground">
            <Target className="size-5" aria-hidden />
            No goals set for this customer yet.
            <Button asChild size="sm" variant="outline">
              <Link href={href}>Add a goal</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="tabular text-2xl font-semibold">{formatPercent(data.summary.funded_pct)}</span>
              <span className="text-xs text-muted-foreground">funded overall</span>
            </div>
            <Progress value={Math.min(data.summary.funded_pct ?? 0, 100)} aria-label="Overall goal funding" />
            <p className="tabular text-sm text-muted-foreground">
              <span title={formatMoney(data.summary.total_funded)} className="font-medium text-foreground">
                {formatMoneyCompact(data.summary.total_funded)}
              </span>{" "}
              of <span title={formatMoney(data.summary.total_target)}>{formatMoneyCompact(data.summary.total_target)}</span> target
            </p>
            {data.summary.flagged > 0 ? (
              <p className="flex items-center gap-1.5 text-sm text-warning">
                <AlertTriangle className="size-4" aria-hidden />
                {pluralize(data.summary.flagged, "goal")} {data.summary.flagged === 1 ? "needs" : "need"} attention
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
