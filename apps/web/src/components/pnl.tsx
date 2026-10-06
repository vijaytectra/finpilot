import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatMoneyCompact, formatPercent, formatSignedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PnlProps {
  amount?: number | null;
  percent?: number | null;
  /** Show the percentage only (amount omitted). */
  percentOnly?: boolean;
  /** Use compact lakh/crore notation for the amount (headline cards). */
  compact?: boolean;
  className?: string;
  iconClassName?: string;
}

/**
 * Gain/loss value. Direction is conveyed by sign, arrow icon and an sr-only word —
 * never by colour alone.
 */
export function Pnl({ amount, percent, percentOnly, compact, className, iconClassName }: PnlProps) {
  const basis = amount ?? percent ?? 0;
  const direction = basis > 0 ? "gain" : basis < 0 ? "loss" : "flat";
  const Icon = direction === "gain" ? ArrowUpRight : direction === "loss" ? ArrowDownRight : Minus;

  const parts: string[] = [];
  if (!percentOnly && amount !== undefined) {
    const text = compact && amount !== null ? formatMoneyCompact(amount) : formatSignedMoney(amount);
    parts.push(compact && amount !== null && amount > 0 ? `+${text}` : text);
  }
  if (percent !== undefined && percent !== null) {
    parts.push(percentOnly || amount === undefined ? formatPercent(percent, { signed: true }) : `(${formatPercent(percent, { signed: true })})`);
  }

  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 font-medium whitespace-nowrap",
        direction === "gain" && "text-positive",
        direction === "loss" && "text-negative",
        direction === "flat" && "text-muted-foreground",
        className,
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", iconClassName)} aria-hidden />
      <span className="sr-only">{direction === "gain" ? "Gain " : direction === "loss" ? "Loss " : "No change "}</span>
      {parts.join(" ")}
    </span>
  );
}
