"use client";

import { UserX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/client";

import { useCustomer } from "../hooks";
import { CustomerHeader, CustomerHeaderSkeleton } from "./customer-header";
import { CustomerTabs } from "./customer-tabs";

/** Header + route tabs shared by every customer sub-page. A 404 replaces the whole view. */
export function CustomerLayout({ customerId, children }: { customerId: string; children: React.ReactNode }) {
  const { data: customer, isPending, isError, error, refetch, isRefetching } = useCustomer(customerId);

  if (isError && isApiError(error) && error.status === 404) {
    return (
      <EmptyState
        icon={UserX}
        title={`Customer ${customerId} was not found`}
        description="The customer may have been removed, or the link may be mistyped."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/customers">Back to customers</Link>
          </Button>
        }
        className="mt-6"
      />
    );
  }

  return (
    <div className="space-y-6">
      {isPending ? (
        <CustomerHeaderSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} compact />
      ) : (
        <CustomerHeader customer={customer} />
      )}
      <CustomerTabs customerId={customerId} />
      <div>{children}</div>
    </div>
  );
}
