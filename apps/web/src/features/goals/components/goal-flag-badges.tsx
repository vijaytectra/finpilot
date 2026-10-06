import { CalendarX2, CircleAlert, FileWarning, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { GoalFlag } from "../types";

export const GOAL_FLAG_META: Record<GoalFlag, { label: string; description: string; icon: typeof CircleAlert; className: string }> = {
  OVERDUE: {
    label: "Overdue",
    description: "The target date has passed and the goal is not fully funded.",
    icon: CalendarX2,
    className: "bg-negative-muted text-negative",
  },
  HIGH_PRIORITY_UNDERFUNDED: {
    label: "Underfunded",
    description: "High-priority goal that is less than 25% funded.",
    icon: CircleAlert,
    className: "bg-warning-muted text-warning",
  },
  OVERFUNDED: {
    label: "Overfunded",
    description: "Funded amount exceeds the target — likely a data inconsistency to review.",
    icon: TrendingUp,
    className: "bg-info-muted text-info",
  },
  NAME_TYPE_MISMATCH: {
    label: "Name/type mismatch",
    description: "The goal name describes a different goal type than the one recorded.",
    icon: FileWarning,
    className: "bg-warning-muted text-warning",
  },
};

/** Flag badges with keyboard-focusable tooltips explaining each business rule. */
export function GoalFlagBadges({ flags, className }: { flags: GoalFlag[]; className?: string }) {
  if (flags.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Goal flags">
      {flags.map((flag) => {
        const meta = GOAL_FLAG_META[flag];
        const Icon = meta.icon;
        return (
          <li key={flag}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  tabIndex={0}
                  className={cn("cursor-help outline-none focus-visible:ring-3 focus-visible:ring-ring/50", meta.className)}
                >
                  <Icon aria-hidden />
                  {meta.label}
                  <span className="sr-only">: {meta.description}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-60">{meta.description}</TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
