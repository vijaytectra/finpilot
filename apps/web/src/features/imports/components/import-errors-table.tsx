"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";

import { PaginationBar } from "@/components/pagination-bar";
import { ErrorState } from "@/components/states/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useImportErrors } from "../hooks";
import type { ImportRowError } from "../types";

interface ImportErrorsTableProps {
  batchId: string;
  rejected: number;
  page: number;
  onPageChange: (page: number) => void;
}

/** Row-level rejections, paged from GET /admin/imports/{id}/errors, each expandable to its raw CSV values. */
export function ImportErrorsTable({ batchId, rejected, page, onPageChange }: ImportErrorsTableProps) {
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData, isFetching } = useImportErrors(
    batchId,
    page,
    rejected > 0,
  );

  if (rejected === 0) {
    return (
      <p className="flex items-center gap-2 rounded-md border bg-positive-muted/40 p-3 text-sm">
        <CheckCircle2 className="size-4 text-positive" aria-hidden />
        No rows were rejected.
      </p>
    );
  }
  if (isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading rejected rows">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} compact />;

  return (
    <div className="space-y-3">
      <div className={cn("overflow-x-auto transition-opacity", isPlaceholderData && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Line</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="hidden md:table-cell">Field</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Raw row</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => (
              <ErrorRow key={`${row.line_number}-${row.error_code}-${row.field ?? ""}`} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationBar pagination={data.pagination} onPageChange={onPageChange} itemLabel="rejected rows" isFetching={isFetching} />
    </div>
  );
}

function ErrorRow({ row }: { row: ImportRowError }) {
  const [open, setOpen] = useState(false);
  const detailsId = `raw-${row.line_number}-${row.error_code}`;
  const entries = Object.entries(row.raw_data ?? {});
  return (
    <Fragment>
      <TableRow>
        <TableCell className="tabular font-mono text-xs">{row.line_number}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-negative-muted font-mono text-[11px] text-negative">
            {row.error_code}
          </Badge>
          <span className="sr-only"> ({humanizeEnum(row.error_code)})</span>
        </TableCell>
        <TableCell className="hidden font-mono text-xs md:table-cell">{row.field ?? "—"}</TableCell>
        <TableCell className="min-w-56 text-sm whitespace-normal">{row.message}</TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={detailsId}
          >
            {open ? "Hide" : "Raw row"}
            <ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden />
          </Button>
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow id={detailsId} className="bg-muted/40 hover:bg-muted/40">
          <TableCell colSpan={5}>
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No raw values were captured for this line.</p>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-2 lg:grid-cols-3">
                {entries.map(([key, value]) => (
                  <div key={key} className={cn("flex gap-2", key === row.field && "font-semibold text-negative")}>
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="break-all">{value === null || value === "" ? "∅" : String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}
