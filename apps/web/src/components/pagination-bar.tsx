"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

interface PaginationBarProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  /** Noun for the range label, e.g. "customers". */
  itemLabel?: string;
  isFetching?: boolean;
  className?: string;
}

/** "Showing 21–40 of 120" + first/prev/next/last. Server-side pagination only. */
export function PaginationBar({ pagination, onPageChange, itemLabel = "results", isFetching, className }: PaginationBarProps) {
  const { page, page_size, total, pages } = pagination;
  if (total === 0) return null;
  const from = (page - 1) * page_size + 1;
  const to = Math.min(page * page_size, total);
  const lastPage = Math.max(pages, 1);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col items-center justify-between gap-3 text-sm sm:flex-row", className)}
    >
      <p className="text-muted-foreground" aria-live="polite">
        Showing <span className="tabular font-medium text-foreground">{formatInteger(from)}</span>–
        <span className="tabular font-medium text-foreground">{formatInteger(to)}</span> of{" "}
        <span className="tabular font-medium text-foreground">{formatInteger(total)}</span> {itemLabel}
        {isFetching ? <span className="sr-only"> (updating)</span> : null}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label="First page"
          className="hidden sm:inline-flex"
        >
          <ChevronsLeft aria-hidden />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="tabular px-2 text-muted-foreground">
          Page {formatInteger(page)} of {formatInteger(lastPage)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(lastPage)}
          disabled={page >= lastPage}
          aria-label="Last page"
          className="hidden sm:inline-flex"
        >
          <ChevronsRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
