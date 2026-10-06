import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ImportStatus } from "../types";

const META: Record<ImportStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  COMPLETED: { label: "Completed", icon: CheckCircle2, className: "bg-positive-muted text-positive" },
  PROCESSING: { label: "Processing", icon: Loader2, className: "bg-info-muted text-info" },
  FAILED: { label: "Failed", icon: XCircle, className: "bg-negative-muted text-negative" },
};

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="secondary" className={meta.className}>
      <Icon className={cn(status === "PROCESSING" && "animate-spin")} aria-hidden />
      {meta.label}
    </Badge>
  );
}
