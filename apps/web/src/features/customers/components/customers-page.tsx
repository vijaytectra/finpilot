"use client";

import { SearchX, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { formatInteger } from "@/lib/format";

import { useCustomers } from "../hooks";
import { parseCustomerListParams } from "../url-state";
import { CustomerCards } from "./customer-cards";
import { CustomersFilters } from "./customers-filters";
import { CustomersTable } from "./customers-table";

export function CustomersPage() {
  const searchParams = useSearchParams();
  const params = parseCustomerListParams(searchParams);
  const update = useSearchParamsUpdater();
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData, isFetching } = useCustomers(params);
  const hasFilters = Boolean(params.search || params.kyc_status || params.segment);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={
          data ? `${formatInteger(data.pagination.total)} ${hasFilters ? "matching customers" : "customers in the book"}` : "Search and browse the customer book"
        }
      />

      <Card>
        <CardContent className="space-y-5 px-3 sm:px-6">
          <CustomersFilters params={params} onChange={update} />

          {isPending ? (
            <CustomersSkeleton />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} />
          ) : data.items.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="No customers match these filters"
                description={params.search ? `Nothing found for “${params.search}”. Try a different name, ID, email or city.` : "Try widening the KYC or segment filter."}
                action={
                  <Button variant="outline" size="sm" onClick={() => update({ search: null, kyc_status: null, segment: null }, { resetPage: true })}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={Users} title="No customers yet" description="Customers appear here once the seed data has been imported." />
            )
          ) : (
            <div aria-busy={isFetching} className="space-y-4">
              <div className="hidden md:block">
                <CustomersTable
                  customers={data.items}
                  sort={params.sort}
                  onSort={(sort) => update({ sort }, { resetPage: true })}
                  isFetching={isPlaceholderData}
                />
              </div>
              <div className="md:hidden">
                <CustomerCards customers={data.items} isFetching={isPlaceholderData} />
              </div>
              <PaginationBar
                pagination={data.pagination}
                onPageChange={(page) => update({ page: page === 1 ? null : page })}
                itemLabel="customers"
                isFetching={isFetching}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CustomersSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading customers">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
