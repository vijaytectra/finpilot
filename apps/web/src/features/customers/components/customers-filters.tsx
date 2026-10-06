"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ParamPatch } from "@/hooks/use-search-params-updater";

import { CUSTOMER_SORTS, KYC_STATUSES, SEGMENTS, type CustomerListParams } from "../types";
import { SORT_LABELS } from "../url-state";

const ALL = "all";

const KYC_LABEL = { VERIFIED: "Verified", PENDING: "Pending", REVIEW: "In review" } as const;

interface CustomersFiltersProps {
  params: CustomerListParams;
  onChange: (patch: ParamPatch, options?: { replace?: boolean; resetPage?: boolean }) => void;
}

export function CustomersFilters({ params, onChange }: CustomersFiltersProps) {
  const [term, setTerm] = useState(params.search ?? "");
  const debounced = useDebouncedValue(term.trim(), 300);
  const lastPushed = useRef(params.search ?? "");

  // Keep the box in sync when the URL changes from outside (back button, global search).
  useEffect(() => {
    const fromUrl = params.search ?? "";
    if (fromUrl !== lastPushed.current) {
      lastPushed.current = fromUrl;
      setTerm(fromUrl);
    }
  }, [params.search]);

  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    onChange({ search: debounced }, { replace: true, resetPage: true });
  }, [debounced, onChange]);

  const hasFilters = Boolean(params.search || params.kyc_status || params.segment);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="customer-search">Search</Label>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id="customer-search"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name, ID, email or city"
            maxLength={100}
            autoComplete="off"
          />
          {term ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setTerm("")}>
                <X aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
        <div className="space-y-1.5">
          <Label htmlFor="kyc-filter">KYC status</Label>
          <Select
            value={params.kyc_status ?? ALL}
            onValueChange={(v) => onChange({ kyc_status: v === ALL ? null : v }, { resetPage: true })}
          >
            <SelectTrigger id="kyc-filter" className="w-full lg:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {KYC_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {KYC_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="segment-filter">Segment</Label>
          <Select
            value={params.segment ?? ALL}
            onValueChange={(v) => onChange({ segment: v === ALL ? null : v }, { resetPage: true })}
          >
            <SelectTrigger id="segment-filter" className="w-full lg:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All segments</SelectItem>
              {SEGMENTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label htmlFor="customer-sort">Sort by</Label>
          <Select value={params.sort} onValueChange={(v) => onChange({ sort: v }, { resetPage: true })}>
            <SelectTrigger id="customer-sort" className="w-full lg:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOMER_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          onClick={() => {
            setTerm("");
            lastPushed.current = "";
            onChange({ search: null, kyc_status: null, segment: null }, { resetPage: true });
          }}
        >
          <X aria-hidden /> Clear filters
        </Button>
      ) : null}
    </div>
  );
}
