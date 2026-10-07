import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

import type { CustomerProfile } from "../types";
import { KycBadge, SegmentBadge } from "./customer-badges";

export function CustomerHeader({ customer }: { customer: CustomerProfile }) {
  return (
    <div className="space-y-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/customers">Customers</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{customer.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 rounded-[10px] border bg-card p-5 shadow-card sm:p-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">{customer.full_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[13px] text-muted-foreground">{customer.customer_id}</span>
            <KycBadge status={customer.kyc_status} />
            <SegmentBadge segment={customer.segment} />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              <span className="sr-only">Location: </span>
              {customer.city}, {customer.state}
            </li>
            <li className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">Email: </span>
              <a href={`mailto:${customer.email}`} className="min-w-0 truncate hover:text-foreground hover:underline">
                {customer.email}
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <Phone className="size-3.5" aria-hidden />
              <span className="sr-only">Phone: </span>
              <a href={`tel:${customer.phone}`} className="tabular hover:text-foreground hover:underline">
                {customer.phone}
              </a>
            </li>
          </ul>
        </div>
        <p className="text-[13px] text-muted-foreground md:text-right">Customer since {formatDate(customer.onboarded_at)}</p>
      </div>
    </div>
  );
}

export function CustomerHeaderSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading customer">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-3 rounded-[10px] border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
    </div>
  );
}
