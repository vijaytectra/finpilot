import { StatusDot, type StatusTone } from "@/components/status-dot";

import type { ImportStatus } from "../types";

const META: Record<ImportStatus, { label: string; tone: StatusTone }> = {
  COMPLETED: { label: "Completed", tone: "positive" },
  PROCESSING: { label: "Processing", tone: "warning" },
  FAILED: { label: "Failed", tone: "negative" },
};

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  const meta = META[status];
  return <StatusDot tone={meta.tone}>{meta.label}</StatusDot>;
}
