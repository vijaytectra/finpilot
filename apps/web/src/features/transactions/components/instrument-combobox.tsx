"use client";

import { ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { FacetOption } from "../types";

interface InstrumentComboboxProps {
  id?: string;
  options: FacetOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
}

/** Searchable single-select over the customer's traded instruments (from /transactions/facets). */
export function InstrumentCombobox({ id, options, value, onChange }: InstrumentComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", selected && "pr-8")}
          >
            <span className="truncate">{selected ? selected.label : "All instruments"}</span>
            {selected ? null : <ChevronsUpDown className="opacity-50" aria-hidden />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search symbol or name…" aria-label="Search instruments" />
            <CommandList>
              <CommandEmpty>No instrument found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    data-checked={option.value === value}
                    onSelect={() => {
                      onChange(option.value === value ? undefined : option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="tabular text-xs text-muted-foreground">{formatInteger(option.count)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
          onClick={() => onChange(undefined)}
          aria-label="Clear instrument filter"
        >
          <X aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
