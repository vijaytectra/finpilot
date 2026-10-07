import { cn } from "@/lib/utils";

export interface StatStripItem {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Full-precision value as a tooltip when `value` is compact. */
  title?: string;
}

/** Several figures on one surface, separated by hairlines. Wraps to 2 columns on phones. */
export function StatStrip({
  items,
  label,
  className,
  bare = false,
}: {
  items: StatStripItem[];
  label: string;
  className?: string;
  /** `bare` drops the surface, for use inside another card. */
  bare?: boolean;
}) {
  return (
    <section aria-label={label} className={cn(!bare && "rounded-[10px] border bg-card shadow-card", className)}>
      <dl
        style={{ "--cols": items.length } as React.CSSProperties}
        className={cn(
          "grid grid-cols-2 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]",
          "[&>div]:border-border max-sm:[&>div:nth-child(n+3)]:border-t max-sm:[&>div:nth-child(even)]:border-l sm:[&>div+div]:border-l",
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="min-w-0 px-5 py-4">
            <dt className="text-[13px] text-muted-foreground">{item.label}</dt>
            <dd className="tabular mt-1 truncate text-xl leading-tight font-semibold tracking-[-0.01em]" title={item.title}>
              {item.value}
            </dd>
            {item.hint ? <dd className="mt-0.5 truncate text-xs text-muted-foreground">{item.hint}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
