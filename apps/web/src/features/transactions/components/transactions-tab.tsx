"use client";

import { ArrowLeftRight, FilterX } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Transactions</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {list.data ? `${formatInteger(list.data.pagination.total)} ${active ? "matching" : "in total"}` : "Trade history"}
          {range ? ` · trades from ${range}` : ""}
        </p>
      </div>

      <TransactionsFilters filters={filters} facets={facets.data} facetsLoading={facets.isPending} onChange={update} />

      {list.isPending ? (
        <div className="rounded-[10px] border bg-card p-4 shadow-card">
          <div className="space-y-2" aria-busy="true" aria-label="Loading transactions">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : list.isError ? (
        <div className="rounded-[10px] border bg-card p-4 shadow-card">
          <ErrorState error={list.error} onRetry={() => void list.refetch()} isRetrying={list.isRefetching} />
        </div>
      ) : list.data.items.length === 0 ? (
        <div className="rounded-[10px] border bg-card p-4 shadow-card">
          {active > 0 ? (
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
          )}
        </div>
      ) : (
        <div aria-busy={list.isFetching} className="overflow-hidden rounded-[10px] border bg-card shadow-card">
          <TransactionsTable
            transactions={list.data.items}
            showAccount={(facets.data?.accounts.length ?? 2) > 1}
            isStale={list.isPlaceholderData}
          />
          <PaginationBar
            className="border-t px-4 py-3"
            pagination={list.data.pagination}
            onPageChange={(page) => update({ [TX_PARAM.page]: page === 1 ? null : page })}
            itemLabel="transactions"
            isFetching={list.isFetching}
          />
        </div>
      )}
    </div>
  );
}
