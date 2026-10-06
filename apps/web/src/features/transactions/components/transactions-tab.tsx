"use client";

import { ArrowLeftRight, FilterX } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { formatDate, formatInteger } from "@/lib/format";

import { CLEAR_TRANSACTION_FILTERS, countActiveFilters, parseTransactionFilters, TX_PARAM } from "../filters";
import { useTransactionFacets, useTransactions } from "../hooks";
import { TransactionsFilters } from "./transactions-filters";
import { TransactionsTable } from "./transactions-table";

export function TransactionsTab({ customerId }: { customerId: string }) {
  const searchParams = useSearchParams();
  const filters = parseTransactionFilters(searchParams);
  const update = useSearchParamsUpdater();
  const facets = useTransactionFacets(customerId);
  const list = useTransactions(customerId, filters);
  const active = countActiveFilters(filters);

  const range =
    facets.data?.min_trade_date && facets.data.max_trade_date
      ? `${formatDate(facets.data.min_trade_date)} – ${formatDate(facets.data.max_trade_date)}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          {list.data ? `${formatInteger(list.data.pagination.total)} ${active ? "matching" : "in total"}` : "Trade history"}
          {range ? ` · trades from ${range}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-3 sm:px-6">
        <TransactionsFilters
          filters={filters}
          facets={facets.data}
          facetsLoading={facets.isPending}
          onChange={update}
        />

        {list.isPending ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading transactions">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} isRetrying={list.isRefetching} />
        ) : list.data.items.length === 0 ? (
          active > 0 ? (
            <EmptyState
              icon={FilterX}
              title="No transactions match these filters"
              description="Try widening the date range or removing a filter."
              action={
                <Button variant="outline" size="sm" onClick={() => update(CLEAR_TRANSACTION_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={ArrowLeftRight} title="No transactions yet" description="This customer has no recorded trades." />
          )
        ) : (
          <div className="space-y-4" aria-busy={list.isFetching}>
            <TransactionsTable
              transactions={list.data.items}
              showAccount={(facets.data?.accounts.length ?? 2) > 1}
              isStale={list.isPlaceholderData}
            />
            <PaginationBar
              pagination={list.data.pagination}
              onPageChange={(page) => update({ [TX_PARAM.page]: page === 1 ? null : page })}
              itemLabel="transactions"
              isFetching={list.isFetching}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
