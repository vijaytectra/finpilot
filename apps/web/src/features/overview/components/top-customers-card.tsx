import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatMoneyCompact } from "@/lib/format";

import type { TopCustomer } from "../types";

export function TopCustomersCard({ customers }: { customers: TopCustomer[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top customers by AUM</CardTitle>
        <CardDescription>Current market value of holdings</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/customers?sort=-aum">View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No customers hold any positions yet.</p>
        ) : (
          <ol className="divide-y">
            {customers.map((c, index) => (
              <li key={c.customer_id}>
                <Link
                  href={`/customers/${c.customer_id}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="tabular w-5 text-xs text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.full_name}</span>
                    <span className="block text-xs text-muted-foreground">{c.customer_id}</span>
                  </span>
                  <Badge variant="outline" className="hidden sm:inline-flex lg:hidden xl:inline-flex">
                    {c.segment}
                  </Badge>
                  <span className="tabular w-20 text-right text-sm font-medium" title={formatMoney(c.aum)}>
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
