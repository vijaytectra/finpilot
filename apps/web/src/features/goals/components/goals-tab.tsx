"use client";

import { Plus, Target } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { StatStrip } from "@/components/stat-strip";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Goals</h2>
          <p className="text-sm text-muted-foreground">Track funding progress and flag goals that need a conversation.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden /> Add goal
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading goals">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((goal) => (
              <li key={goal.goal_id} className="h-full">
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
    <div className="rounded-[10px] border bg-card shadow-card">
      <StatStrip
        bare
        label="Goal funding summary"
        items={[
          { label: "Overall funding", value: formatPercent(summary.funded_pct) },
          {
            label: "Funded / target",
            value: `${formatMoneyCompact(summary.total_funded)} / ${formatMoneyCompact(summary.total_target)}`,
            title: `${formatMoney(summary.total_funded)} of ${formatMoney(summary.total_target)}`,
          },
          {
            label: "Goals",
            value: pluralize(summary.goals, "goal"),
            hint: summary.flagged > 0 ? <span className="text-warning">{summary.flagged} flagged</span> : undefined,
          },
        ]}
      />
      <div className="space-y-2 border-t px-5 py-4">
        <p className="text-xs text-muted-foreground">Overall funding progress</p>
        <Progress value={Math.min(summary.funded_pct ?? 0, 100)} aria-label="Overall goal funding" />
      </div>
    </div>
  );
}
