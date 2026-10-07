import Link from "next/link";

import { InitialsAvatar } from "@/components/initials-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatMoneyCompact } from "@/lib/format";

import type { TopCustomer } from "../types";

/** The overview shows a short leaderboard; "View all" opens the full AUM-sorted list. */
const MAX_ROWS = 5;

export function TopCustomersCard({ customers }: { customers: TopCustomer[] }) {
  const shown = customers.slice(0, MAX_ROWS);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top customers by AUM</CardTitle>
        <CardDescription>Current market value of holdings</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/customers?sort=-aum">View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No customers hold any positions yet.</p>
        ) : (
          <ol className="divide-y">
            {shown.map((c, index) => (
              <li key={c.customer_id}>
                <Link
                  href={`/customers/${c.customer_id}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="tabular w-4 text-xs text-muted-foreground">{index + 1}</span>
                  <InitialsAvatar name={c.full_name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.full_name}</span>
                    <span className="block font-mono text-[12px] text-muted-foreground">{c.customer_id}</span>
                  </span>
                  <span className="tabular text-right text-sm font-semibold" title={formatMoney(c.aum)}>
                    {formatMoneyCompact(c.aum)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
