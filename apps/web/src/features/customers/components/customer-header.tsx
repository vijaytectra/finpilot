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
import { Card, CardContent } from "@/components/ui/card";
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

      <Card className="py-5">
        <CardContent className="flex flex-col gap-3 px-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{customer.full_name}</h1>
              <span className="tabular rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {customer.customer_id}
              </span>
              <KycBadge status={customer.kyc_status} />
              <SegmentBadge segment={customer.segment} />
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                <span className="sr-only">Location: </span>
                {customer.city}, {customer.state}
              </li>
              <li className="flex min-w-0 items-center gap-1.5">
                <Mail className="size-3.5 shrink-0" aria-hidden />
                <span className="sr-only">Email: </span>
                <a href={`mailto:${customer.email}`} className="truncate hover:text-foreground hover:underline">
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
          <p className="text-xs text-muted-foreground">Customer since {formatDate(customer.onboarded_at)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerHeaderSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading customer">
      <Skeleton className="h-4 w-40" />
      <Card className="py-5">
        <CardContent className="space-y-3 px-5">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
