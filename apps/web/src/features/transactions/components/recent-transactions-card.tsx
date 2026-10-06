"use client";

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useTransactions } from "../hooks";
import type { TransactionFilters } from "../types";
import { TransactionStatusBadge, TransactionTypeBadge, transactionRowClass } from "./transaction-badges";

const RECENT: TransactionFilters = {
  transaction_type: [],
  status: [],
  sort: "-trade_date",
  page: 1,
  page_size: 5,
};

export function RecentTransactionsCard({ customerId }: { customerId: string }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useTransactions(customerId, RECENT);
  const href = `/customers/${customerId}/transactions`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
        <CardDescription>
          {data ? `Latest 5 of ${data.pagination.total}` : "Latest activity across all accounts"}
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} compact />
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <ArrowLeftRight className="size-5" aria-hidden />
            No transactions recorded yet.
          </div>
        ) : (
          <ul className="divide-y">
            {data.items.map((t) => (
              <li
                key={t.transaction_id}
                className={cn("flex items-center gap-3 py-2.5 text-sm", transactionRowClass(t.status), "bg-transparent")}
              >
                <div className="w-20 shrink-0 text-xs text-muted-foreground">{formatDate(t.trade_date)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.symbol}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.instrument_name}</p>
                </div>
                <div className="hidden sm:block">
                  <TransactionTypeBadge type={t.transaction_type} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="tabular font-medium" data-amount>
                    {formatMoney(t.amount)}
                  </span>
                  {t.status !== "SETTLED" ? <TransactionStatusBadge status={t.status} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
