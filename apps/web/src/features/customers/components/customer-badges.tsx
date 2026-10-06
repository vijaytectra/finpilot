import { BadgeCheck, Clock, SearchCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { KycStatus, Segment } from "../types";

const KYC: Record<KycStatus, { label: string; icon: typeof BadgeCheck; className: string }> = {
  VERIFIED: { label: "KYC verified", icon: BadgeCheck, className: "bg-positive-muted text-positive" },
  PENDING: { label: "KYC pending", icon: Clock, className: "bg-warning-muted text-warning" },
  REVIEW: { label: "KYC in review", icon: SearchCheck, className: "bg-info-muted text-info" },
};

export function KycBadge({ status, className }: { status: KycStatus; className?: string }) {
  const meta = KYC[status];
  const Icon = meta.icon;
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}

const SEGMENT_STYLE: Record<Segment, string> = {
  Mass: "",
  Affluent: "border-primary/30 text-primary",
  HNI: "border-primary bg-primary text-primary-foreground",
};

export function SegmentBadge({ segment, className }: { segment: Segment; className?: string }) {
  return (
    <Badge variant="outline" className={cn(SEGMENT_STYLE[segment], className)}>
      {segment}
      <span className="sr-only"> segment</span>
    </Badge>
  );
}
