"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { InitialsAvatar } from "@/components/initials-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger, formatMoney, formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { CustomerListItem, CustomerSort } from "../types";
import { KycBadge, SegmentBadge } from "./customer-badges";

interface SortableColumn {
  label: string;
  /** Sort applied on click given the current sort (the API supports only these directions). */
  next: (current: CustomerSort) => CustomerSort;
  /** Direction indicated when this column is the active sort. */
  direction: (current: CustomerSort) => "ascending" | "descending" | null;
}

const COLUMNS: Record<"name" | "id" | "city" | "aum", SortableColumn> = {
  name: { label: "Customer", next: () => "full_name", direction: (s) => (s === "full_name" ? "ascending" : null) },
  id: { label: "ID", next: () => "customer_id", direction: (s) => (s === "customer_id" ? "ascending" : null) },
  city: { label: "Location", next: () => "city", direction: (s) => (s === "city" ? "ascending" : null) },
  aum: {
    label: "AUM",
    next: (s) => (s === "-aum" ? "aum" : "-aum"),
    direction: (s) => (s === "-aum" ? "descending" : s === "aum" ? "ascending" : null),
  },
};

function SortHeader({
  column,
  sort,
  onSort,
  className,
  align = "left",
}: {
  column: SortableColumn;
  sort: CustomerSort;
  onSort: (sort: CustomerSort) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const direction = column.direction(sort);
  const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead aria-sort={direction ?? "none"} className={className}>
      <button
        type="button"
        onClick={() => onSort(column.next(sort))}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          align === "right" && "flex-row-reverse",
          direction ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {column.label}
        <Icon className={cn("size-3.5", !direction && "opacity-50")} aria-hidden />
        <span className="sr-only">, sort</span>
      </button>
    </TableHead>
  );
}

interface CustomersTableProps {
  customers: CustomerListItem[];
  sort: CustomerSort;
  onSort: (sort: CustomerSort) => void;
  isFetching?: boolean;
}

/** Desktop table (md+). Whole row is clickable; the name is the real link for keyboard/AT users. */
export function CustomersTable({ customers, sort, onSort, isFetching }: CustomersTableProps) {
  const router = useRouter();
  return (
    <Table className={cn("transition-opacity", isFetching && "opacity-60")}>
      <TableHeader>
        <TableRow>
          <SortHeader column={COLUMNS.name} sort={sort} onSort={onSort} className="pl-5" />
          <SortHeader column={COLUMNS.id} sort={sort} onSort={onSort} />
          <SortHeader column={COLUMNS.city} sort={sort} onSort={onSort} className="hidden lg:table-cell" />
          <TableHead>KYC</TableHead>
          <TableHead>Segment</TableHead>
          <TableHead className="text-right">Accounts</TableHead>
          <SortHeader column={COLUMNS.aum} sort={sort} onSort={onSort} className="text-right" align="right" />
          <TableHead className="w-8 pr-5">
            <span className="sr-only">Open</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => (
          <TableRow
            key={c.customer_id}
            className="cursor-pointer"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) return;
              router.push(`/customers/${c.customer_id}`);
            }}
          >
            <TableCell className="max-w-72 pl-5">
              <div className="flex items-center gap-3">
                <InitialsAvatar name={c.full_name} />
                <div className="min-w-0">
                  <Link
                    href={`/customers/${c.customer_id}`}
                    className="block truncate text-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {c.full_name}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                </div>
              </div>
            </TableCell>
            <TableCell className="font-mono text-[13px] text-muted-foreground">{c.customer_id}</TableCell>
            <TableCell className="hidden lg:table-cell">
              {c.city}, {c.state}
            </TableCell>
            <TableCell>
              <KycBadge status={c.kyc_status} />
            </TableCell>
            <TableCell>
              <SegmentBadge segment={c.segment} />
            </TableCell>
            <TableCell className="tabular text-right">{formatInteger(c.accounts)}</TableCell>
            <TableCell className="tabular text-right font-medium" title={formatMoney(c.aum)}>
              {c.aum > 0 ? formatMoneyCompact(c.aum) : <span className="font-normal text-muted-foreground">No holdings</span>}
            </TableCell>
            <TableCell className="pr-5">
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
