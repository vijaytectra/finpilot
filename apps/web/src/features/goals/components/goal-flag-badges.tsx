import { StatusDot } from "@/components/status-dot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { GoalFlag } from "../types";

export const GOAL_FLAG_META: Record<GoalFlag, { label: string; description: string }> = {
  OVERDUE: {
    label: "Overdue",
    description: "The target date has passed and the goal is not fully funded.",
  },
  HIGH_PRIORITY_UNDERFUNDED: {
    label: "Underfunded",
    description: "High-priority goal that is less than 25% funded.",
  },
  OVERFUNDED: {
    label: "Overfunded",
    description: "Funded amount exceeds the target — likely a data inconsistency to review.",
  },
  NAME_TYPE_MISMATCH: {
    label: "Name/type mismatch",
    description: "The goal name describes a different goal type than the one recorded.",
  },
};

/** Flag indicators with keyboard-focusable tooltips explaining each business rule. */
export function GoalFlagBadges({ flags, className }: { flags: GoalFlag[]; className?: string }) {
  if (flags.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1.5", className)} aria-label="Goal flags">
      {flags.map((flag) => {
        const meta = GOAL_FLAG_META[flag];
        return (
          <li key={flag}>
            <Tooltip>
              <TooltipTrigger asChild>
                <StatusDot
                  tone="warning"
                  tabIndex={0}
                  className="cursor-help rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {meta.label}
                  <span className="sr-only">: {meta.description}</span>
                </StatusDot>
              </TooltipTrigger>
              <TooltipContent className="max-w-60">{meta.description}</TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
