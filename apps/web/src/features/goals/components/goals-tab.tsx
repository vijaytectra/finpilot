"use client";

import { Plus, Target } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatMoneyCompact, formatPercent, pluralize } from "@/lib/format";

import { useGoals } from "../hooks";
import type { Goal, GoalSummary } from "../types";
import { GoalCard } from "./goal-card";
import { GoalFormDialog } from "./goal-form-dialog";

export function GoalsTab({ customerId }: { customerId: string }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useGoals(customerId);
  const [dialog, setDialog] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });

  const openCreate = () => setDialog({ open: true, goal: null });
  const openEdit = (goal: Goal) => setDialog({ open: true, goal });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Goals</h2>
          <p className="text-sm text-muted-foreground">Track funding progress and flag goals that need a conversation.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden /> Add goal
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading goals">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Add the customer's first goal to start tracking how well funded it is."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus aria-hidden /> Add goal
            </Button>
          }
        />
      ) : (
        <>
          <GoalsSummaryStrip summary={data.summary} />
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((goal) => (
              <li key={goal.goal_id}>
                <GoalCard goal={goal} onEdit={openEdit} />
              </li>
            ))}
          </ul>
        </>
      )}

      <GoalFormDialog
        customerId={customerId}
        open={dialog.open}
        goal={dialog.goal}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}

function GoalsSummaryStrip({ summary }: { summary: GoalSummary }) {
  return (
    <Card className="py-4">
      <CardContent className="grid gap-4 px-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Overall funding</span>
            <span className="tabular font-semibold">{formatPercent(summary.funded_pct)}</span>
          </div>
          <Progress value={Math.min(summary.funded_pct ?? 0, 100)} aria-label="Overall goal funding" />
        </div>
        <dl className="tabular grid grid-cols-2 gap-6 text-sm sm:contents">
          <div>
            <dt className="text-xs text-muted-foreground">Funded / target</dt>
            <dd className="font-medium" title={`${formatMoney(summary.total_funded)} of ${formatMoney(summary.total_target)}`}>
              {formatMoneyCompact(summary.total_funded)} / {formatMoneyCompact(summary.total_target)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Goals</dt>
            <dd className="font-medium">
              {pluralize(summary.goals, "goal")}
              {summary.flagged > 0 ? <span className="text-warning"> · {summary.flagged} flagged</span> : null}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
