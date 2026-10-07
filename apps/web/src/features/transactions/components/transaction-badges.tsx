import { CheckCircle2, Clock, Undo2 } from "lucide-react";

import { humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { TransactionStatus, TransactionType } from "../types";

const STATUS: Record<TransactionStatus, { label: string; icon: typeof Clock; className: string; description: string }> = {
  SETTLED: {
    label: "Settled",
    icon: CheckCircle2,
    className: "text-positive",
    description: "Trade has settled",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "text-warning",
    description: "Awaiting settlement",
  },
  REVERSED: {
    label: "Reversed",
    icon: Undo2,
    className: "text-muted-foreground",
    description: "Trade was reversed and has no effect on holdings",
  },
};

/** Status shown with icon + text (never colour alone). */
export function TransactionStatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  const meta = STATUS[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]", className)}
      title={meta.description}
      data-status={status}
    >
      <Icon className={cn("size-3.5", meta.className)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function TransactionTypeBadge({ type, className }: { type: TransactionType; className?: string }) {
  return <span className={cn("text-[13px] font-medium text-foreground", className)}>{humanizeEnum(type)}</span>;
}

/** Row treatment for non-settled transactions: reversed rows are muted + struck through. */
export function transactionRowClass(status: TransactionStatus): string {
  if (status === "REVERSED") return "text-muted-foreground [&_[data-amount]]:line-through";
  if (status === "PENDING") return "bg-warning-muted/30";
  return "";
}
