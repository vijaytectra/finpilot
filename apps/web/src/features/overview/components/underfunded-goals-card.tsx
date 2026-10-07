import { AlertTriangle, PartyPopper } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatMoney, formatMoneyCompact, formatPercent, humanizeEnum } from "@/lib/format";

import type { UnderfundedGoal } from "../types";

/** Enough to start the conversation; the customer's goals page has the rest. */
const MAX_ROWS = 8;

export function UnderfundedGoalsCard({ goals }: { goals: UnderfundedGoal[] }) {
  const shown = goals.slice(0, MAX_ROWS);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" aria-hidden />
          High-priority goals under 25% funded
        </CardTitle>
        <CardDescription>Candidates for a funding conversation, least funded first</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <PartyPopper className="size-5" aria-hidden />
            Every high-priority goal is at least 25% funded.
          </div>
        ) : (
          <ul className="divide-y">
            {shown.map((g) => (
              <li key={g.goal_id}>
                <Link
                  href={`/customers/${g.customer_id}/goals`}
                  className="-mx-2 flex flex-col gap-2 rounded-md px-2 py-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {g.full_name} <span className="font-normal text-muted-foreground">· {humanizeEnum(g.goal_type)}</span>
                  </span>
                  <span className="block min-w-0 space-y-1.5">
                    <Progress
                      value={Math.min(g.funded_pct, 100)}
                      aria-label={`${g.full_name} ${humanizeEnum(g.goal_type)} goal funded`}
                      className="[&>[data-slot=progress-indicator]]:bg-warning"
                    />
                    <span className="tabular block truncate text-[12px] text-muted-foreground" title={formatMoney(g.current_funded_amount)}>
                      {formatMoneyCompact(g.current_funded_amount)} of {formatMoneyCompact(g.target_amount)}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                    <span className="tabular block text-sm font-medium text-warning">{formatPercent(g.funded_pct)}</span>
                    <span className="tabular block text-[12px] text-muted-foreground">Due {formatDate(g.target_date)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
