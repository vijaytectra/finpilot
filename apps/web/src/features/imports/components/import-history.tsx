"use client";

import { History } from "lucide-react";

import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatInteger, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useImportHistory } from "../hooks";
import { ImportStatusBadge } from "./import-status-badge";

interface ImportHistoryProps {
  page: number;
  selectedId: string | null;
  onPageChange: (page: number) => void;
  onSelect: (batchId: string) => void;
}

export function ImportHistory({ page, selectedId, onPageChange, onSelect }: ImportHistoryProps) {
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData, isFetching } = useImportHistory(page);

  if (isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading import history">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isRefetching} compact />;
  if (data.items.length === 0) {
    return <EmptyState icon={History} title="No imports yet" description="Seed loads and uploads will appear here." compact />;
  }

  return (
    <div className="overflow-hidden rounded-[10px] border bg-card shadow-card">
      <div className={cn("overflow-x-auto transition-opacity", isPlaceholderData && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Started</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="hidden lg:table-cell">Uploaded by</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-right">Inserted</TableHead>
              <TableHead className="text-right">Duplicates</TableHead>
              <TableHead className="text-right">Rejected</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((b) => {
              const selected = b.id === selectedId;
              return (
                <TableRow key={b.id} data-state={selected ? "selected" : undefined}>
                  <TableCell className="pl-5 text-[13px] whitespace-nowrap">{formatDateTime(b.started_at)}</TableCell>
                  <TableCell className="max-w-48">
                    <span className="block truncate font-medium">{b.filename}</span>
                    <span className="text-xs text-muted-foreground">{humanizeEnum(b.kind)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.source === "UPLOAD" ? "default" : "outline"}>{b.source}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs lg:table-cell">{b.uploaded_by ?? "System"}</TableCell>
                  <TableCell className="tabular text-right">{formatInteger(b.total_rows)}</TableCell>
                  <TableCell className="tabular text-right">{formatInteger(b.inserted_rows)}</TableCell>
                  <TableCell className="tabular text-right">{formatInteger(b.duplicate_rows)}</TableCell>
                  <TableCell className={cn("tabular text-right", b.rejected_rows > 0 && "font-medium text-negative")}>
                    {formatInteger(b.rejected_rows)}
                  </TableCell>
                  <TableCell>
                    <ImportStatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      variant={selected ? "secondary" : "ghost"}
                      size="xs"
                      onClick={() => onSelect(b.id)}
                      aria-pressed={selected}
                      aria-label={`View details of ${b.filename} imported ${formatDateTime(b.started_at)}`}
                    >
                      {selected ? "Viewing" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationBar
        className="border-t px-4 py-3"
        pagination={data.pagination}
        onPageChange={onPageChange}
        itemLabel="imports"
        isFetching={isFetching}
      />
    </div>
  );
}
