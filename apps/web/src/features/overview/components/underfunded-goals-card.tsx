import { AlertTriangle, PartyPopper } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatMoney, formatMoneyCompact, formatPercent, humanizeEnum } from "@/lib/format";

import type { UnderfundedGoal } from "../types";

export function UnderfundedGoalsCard({ goals }: { goals: UnderfundedGoal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" aria-hidden />
          High-priority goals under 25% funded
        </CardTitle>
        <CardDescription>Candidates for a funding conversation, least funded first</CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <PartyPopper className="size-5" aria-hidden />
            Every high-priority goal is at least 25% funded.
          </div>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 md:grid-cols-2">
            {goals.map((g) => (
              <li key={g.goal_id}>
                <Link
                  href={`/customers/${g.customer_id}/goals`}
                  className="-mx-2 block space-y-1.5 rounded-md px-2 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {g.full_name} <span className="font-normal text-muted-foreground">· {humanizeEnum(g.goal_type)}</span>
                    </span>
                    <span className="tabular text-xs font-medium text-warning">{formatPercent(g.funded_pct)}</span>
                  </div>
                  <Progress
                    value={Math.min(g.funded_pct, 100)}
                    aria-label={`${g.full_name} ${humanizeEnum(g.goal_type)} goal funded`}
                    className="[&>[data-slot=progress-indicator]]:bg-warning"
                  />
                  <div className="tabular flex justify-between text-xs text-muted-foreground">
                    <span title={formatMoney(g.current_funded_amount)}>
                      {formatMoneyCompact(g.current_funded_amount)} of {formatMoneyCompact(g.target_amount)}
                    </span>
                    <span>Due {formatDate(g.target_date)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
