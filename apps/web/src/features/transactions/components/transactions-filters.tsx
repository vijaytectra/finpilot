"use client";

import { X } from "lucide-react";

import { DatePicker } from "@/components/date-picker";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParamPatch } from "@/hooks/use-search-params-updater";
import { humanizeEnum } from "@/lib/format";

import { CLEAR_TRANSACTION_FILTERS, countActiveFilters, TX_PARAM } from "../filters";
import {
  TRANSACTION_SORTS,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type TransactionFacets,
  type TransactionFilters,
  type TransactionSort,
} from "../types";
import { InstrumentCombobox } from "./instrument-combobox";

const ALL = "all";

const SORT_LABELS: Record<TransactionSort, string> = {
  "-trade_date": "Newest first",
  trade_date: "Oldest first",
  "-amount": "Largest amount",
  amount: "Smallest amount",
};

interface TransactionsFiltersProps {
  filters: TransactionFilters;
  facets: TransactionFacets | undefined;
  facetsLoading: boolean;
  onChange: (patch: ParamPatch, options?: { replace?: boolean; resetPage?: boolean }) => void;
}

export function TransactionsFilters({ filters, facets, facetsLoading, onChange }: TransactionsFiltersProps) {
  const active = countActiveFilters(filters);
  const set = (patch: ParamPatch) => onChange(patch, { resetPage: true });

  if (facetsLoading) {
    return (
      <div className="flex flex-wrap gap-3" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="w-36 space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Facets failing must not block the list: fall back to the fixed enums without counts.
  const typeOptions = facets
    ? facets.transaction_types.map((o) => ({ value: o.value, label: humanizeEnum(o.label), count: o.count }))
    : TRANSACTION_TYPES.map((v) => ({ value: v, label: humanizeEnum(v) }));
  const statusOptions = facets
    ? facets.statuses.map((o) => ({ value: o.value, label: humanizeEnum(o.label), count: o.count }))
    : TRANSACTION_STATUSES.map((v) => ({ value: v, label: humanizeEnum(v) }));
  const minDate = facets?.min_trade_date ?? undefined;
  const maxDate = facets?.max_trade_date ?? undefined;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-[repeat(2,minmax(10.5rem,0.9fr))_repeat(3,minmax(0,1.1fr))_repeat(2,minmax(0,1fr))]">
        <div className="space-y-1.5">
          <Label htmlFor="tx-from">From</Label>
          <DatePicker
            id="tx-from"
            value={filters.date_from}
            onChange={(v) => set({ [TX_PARAM.dateFrom]: v ?? null })}
            placeholder="Any date"
            min={minDate}
            max={filters.date_to ?? maxDate}
            clearable
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-to">To</Label>
          <DatePicker
            id="tx-to"
            value={filters.date_to}
            onChange={(v) => set({ [TX_PARAM.dateTo]: v ?? null })}
            placeholder="Any date"
            min={filters.date_from ?? minDate}
            max={maxDate}
            clearable
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-account">Account</Label>
          <Select
            value={filters.account_id ?? ALL}
            onValueChange={(v) => set({ [TX_PARAM.account]: v === ALL ? null : v })}
          >
            <SelectTrigger id="tx-account" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {(facets?.accounts ?? []).map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label} ({a.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label htmlFor="tx-instrument">Instrument</Label>
          <InstrumentCombobox
            id="tx-instrument"
            options={facets?.instruments ?? []}
            value={filters.instrument_id}
            onChange={(v) => set({ [TX_PARAM.instrument]: v ?? null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-type">Type</Label>
          <MultiSelectFilter
            id="tx-type"
            label="Transaction type"
            allLabel="All types"
            options={typeOptions}
            selected={filters.transaction_type}
            onChange={(values) => set({ [TX_PARAM.type]: values })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-status">Status</Label>
          <MultiSelectFilter
            id="tx-status"
            label="Status"
            allLabel="All statuses"
            options={statusOptions}
            selected={filters.status}
            onChange={(values) => set({ [TX_PARAM.status]: values })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-sort">Sort</Label>
          <Select value={filters.sort} onValueChange={(v) => set({ [TX_PARAM.sort]: v === "-trade_date" ? null : v })}>
            <SelectTrigger id="tx-sort" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {active > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(CLEAR_TRANSACTION_FILTERS)}>
          <X aria-hidden /> Clear {active} {active === 1 ? "filter" : "filters"}
        </Button>
      ) : null}
    </div>
  );
}

