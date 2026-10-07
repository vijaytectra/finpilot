import { cn } from "@/lib/utils";

export type StatusTone = "positive" | "warning" | "info" | "negative" | "neutral";

const DOT: Record<StatusTone, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  info: "bg-info",
  negative: "bg-negative",
  neutral: "bg-muted-foreground",
};

/** Status as a coloured dot plus text, so meaning never depends on colour alone. */
export function StatusDot({
  tone,
  children,
  className,
  ...props
}: { tone: StatusTone; children: React.ReactNode; className?: string } & React.ComponentProps<"span">) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap", className)} {...props}>
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} aria-hidden />
      {children}
    </span>
  );
}
