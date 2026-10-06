import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Secondary line under the value (e.g. a sub-total or the precise amount). */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /** Full-precision value exposed as a tooltip/title when the main value is compact. */
  title?: string;
  className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, title, className }: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="space-y-1.5 px-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
        </div>
        <p className="tabular truncate text-xl font-semibold tracking-tight sm:text-2xl" title={title}>
          {value}
        </p>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-0 py-4", className)} aria-hidden>
      <CardContent className="space-y-2.5 px-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}
