"use client";

import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, fromIsoDate, toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  /** ISO `YYYY-MM-DD` or undefined. */
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  /** Inclusive bounds, ISO dates. */
  min?: string;
  max?: string;
  clearable?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-describedby"?: string;
}

/** Popover calendar bound to an ISO date string (no timezone conversion on the wire). */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  min,
  max,
  clearable,
  invalid,
  className,
  "aria-describedby": describedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = fromIsoDate(value);
  const minDate = fromIsoDate(min);
  const maxDate = fromIsoDate(max);
  const disabled = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !value && "text-muted-foreground",
              clearable && value && "pr-8",
            )}
          >
            <CalendarIcon aria-hidden />
            {value ? formatDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? maxDate ?? minDate}
            startMonth={minDate}
            endMonth={maxDate}
            captionLayout="dropdown"
            disabled={disabled}
            onSelect={(date) => {
              onChange(date ? toIsoDate(date) : undefined);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {clearable && value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
          onClick={() => onChange(undefined)}
          aria-label="Clear date"
        >
          <X aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
