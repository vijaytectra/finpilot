import { Badge } from "@/components/ui/badge";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { cn } from "@/lib/utils";

import type { KycStatus, Segment } from "../types";

const KYC: Record<KycStatus, { label: string; tone: StatusTone }> = {
  VERIFIED: { label: "KYC verified", tone: "positive" },
  PENDING: { label: "KYC pending", tone: "warning" },
  REVIEW: { label: "KYC in review", tone: "info" },
};

export function KycBadge({ status, className }: { status: KycStatus; className?: string }) {
  const meta = KYC[status];
  return (
    <StatusDot tone={meta.tone} className={className}>
      {meta.label}
    </StatusDot>
  );
}

const SEGMENT_STYLE: Record<Segment, string> = {
  Mass: "border-border bg-transparent text-muted-foreground",
  Affluent: "border-border bg-muted text-foreground",
  HNI: "border-transparent bg-accent text-accent-foreground",
};

export function SegmentBadge({ segment, className }: { segment: Segment; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-md px-1.5 text-xs font-medium", SEGMENT_STYLE[segment], className)}>
      {segment}
      <span className="sr-only"> segment</span>
    </Badge>
  );
}
