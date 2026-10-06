import { CheckCircle2, Clock, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { TransactionStatus, TransactionType } from "../types";

const STATUS: Record<TransactionStatus, { label: string; icon: typeof Clock; className: string; description: string }> = {
  SETTLED: {
    label: "Settled",
    icon: CheckCircle2,
    className: "bg-positive-muted text-positive",
    description: "Trade has settled",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-warning-muted text-warning",
    description: "Awaiting settlement",
  },
  REVERSED: {
    label: "Reversed",
    icon: Undo2,
    className: "bg-negative-muted text-negative",
    description: "Trade was reversed and has no effect on holdings",
  },
};

/** Status shown with icon + text (never colour alone). */
export function TransactionStatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  const meta = STATUS[status];
  const Icon = meta.icon;
  return (
    <Badge variant="secondary" className={cn(meta.className, className)} title={meta.description} data-status={status}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}

const TYPE_STYLE: Record<TransactionType, string> = {
  BUY: "border-chart-1/40 text-foreground",
  SELL: "border-chart-2/40 text-foreground",
  DIVIDEND: "border-positive/40 text-foreground",
  FEE: "border-border text-muted-foreground",
};

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TYPE_STYLE[type])}>
      {humanizeEnum(type)}
    </Badge>
  );
}

/** Row treatment for non-settled transactions: reversed rows are muted + struck through. */
export function transactionRowClass(status: TransactionStatus): string {
  if (status === "REVERSED") return "text-muted-foreground [&_[data-amount]]:line-through";
  if (status === "PENDING") return "bg-warning-muted/30";
  return "";
}
