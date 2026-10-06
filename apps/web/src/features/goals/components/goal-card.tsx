import { CalendarDays, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatMoney, formatPercent, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { Goal, Priority } from "../types";
import { GoalFlagBadges } from "./goal-flag-badges";

const PRIORITY_STYLE: Record<Priority, string> = {
  HIGH: "border-negative/40 text-negative",
  MEDIUM: "border-warning/40 text-warning",
  LOW: "text-muted-foreground",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLE[priority]}>
      {humanizeEnum(priority)} priority
    </Badge>
  );
}

export function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: (goal: Goal) => void }) {
  const overdue = goal.flags.includes("OVERDUE");
  const funded = goal.funded_pct >= 100;
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="truncate leading-snug" title={goal.goal_name}>
          {goal.goal_name}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
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
            <span className="tabular text-2xl font-semibold">{formatPercent(goal.funded_pct)}</span>
            <span className="text-xs text-muted-foreground">funded</span>
          </div>
          <Progress
            value={Math.min(goal.funded_pct, 100)}
            aria-label={`${goal.goal_name}: ${formatPercent(goal.funded_pct)} funded`}
            className={cn(
              funded && "[&>[data-slot=progress-indicator]]:bg-positive",
              overdue && !funded && "[&>[data-slot=progress-indicator]]:bg-negative",
            )}
          />
        </div>
        <dl className="tabular grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Funded</dt>
            <dd className="font-medium">{formatMoney(goal.current_funded_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Target</dt>
            <dd>{formatMoney(goal.target_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Remaining</dt>
            <dd>{formatMoney(goal.remaining_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Target date</dt>
            <dd className={cn("flex items-center gap-1", overdue && "font-medium text-negative")}>
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDate(goal.target_date)}
            </dd>
          </div>
        </dl>
        <GoalFlagBadges flags={goal.flags} className="mt-auto" />
      </CardContent>
    </Card>
  );
}
