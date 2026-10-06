"use client";

import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatInteger } from "@/lib/format";

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectFilterProps {
  id?: string;
  label: string;
  /** Text shown when nothing is selected, e.g. "All types". */
  allLabel: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

/** Checkbox menu for repeated query params (transaction type, status). */
export function MultiSelectFilter({ id, label, allLabel, options, selected, onChange }: MultiSelectFilterProps) {
  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const summary =
    selectedLabels.length === 0 ? allLabel : selectedLabels.length <= 2 ? selectedLabels.join(", ") : `${selectedLabels.length} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button id={id} variant="outline" className="w-full justify-between font-normal" aria-label={`${label}: ${summary}`}>
          <span className="truncate">{summary}</span>
          {selected.length > 0 ? (
            <Badge variant="secondary" className="ml-auto">
              {selected.length}
            </Badge>
          ) : null}
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))
            }
          >
            <span className="flex-1">{option.label}</span>
            {option.count !== undefined ? (
              <span className="tabular text-xs text-muted-foreground">{formatInteger(option.count)}</span>
            ) : null}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>Clear selection</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
