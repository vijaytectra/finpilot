import { Pencil } from "lucide-react";

import { StatusDot, type StatusTone } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatMoney, formatPercent, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { Goal, Priority } from "../types";
import { GoalFlagBadges } from "./goal-flag-badges";

const PRIORITY_TONE: Record<Priority, StatusTone> = {
  HIGH: "negative",
  MEDIUM: "warning",
  LOW: "neutral",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <StatusDot tone={PRIORITY_TONE[priority]}>{humanizeEnum(priority)} priority</StatusDot>;
}

export function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: (goal: Goal) => void }) {
  const overdue = goal.flags.includes("OVERDUE");
  const funded = goal.funded_pct >= 100;
  const low = goal.funded_pct < 25;
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="truncate font-semibold leading-snug" title={goal.goal_name}>
          {goal.goal_name}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{humanizeEnum(goal.goal_type)}</span>
          <PriorityBadge priority={goal.priority} />
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(goal)} aria-label={`Edit goal ${goal.goal_name}`}>
            <Pencil aria-hidden />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="tabular text-[20px] leading-tight font-semibold">{formatPercent(goal.funded_pct)}</span>
            <span className="text-xs text-muted-foreground">funded</span>
          </div>
          <Progress
            value={Math.min(goal.funded_pct, 100)}
            aria-label={`${goal.goal_name}: ${formatPercent(goal.funded_pct)} funded`}
            className={cn(
              "h-1.5",
              low && !funded && "[&>[data-slot=progress-indicator]]:bg-warning",
            )}
          />
        </div>
        <dl className="tabular grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Funded</dt>
            <dd className="font-medium text-foreground">{formatMoney(goal.current_funded_amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target</dt>
            <dd className="text-foreground">{formatMoney(goal.target_amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="text-foreground">{formatMoney(goal.remaining_amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target date</dt>
            <dd className={cn("text-foreground", overdue && "font-medium text-negative")}>{formatDate(goal.target_date)}</dd>
          </div>
        </dl>
        <GoalFlagBadges flags={goal.flags} className="mt-auto" />
      </CardContent>
    </Card>
  );
}
