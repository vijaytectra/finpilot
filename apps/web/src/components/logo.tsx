import { cn } from "@/lib/utils";

/** FinPilot mark: a rising line inside a rounded square. Decorative; pair with visible text. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M8 21.5 13.5 16l4 3.5L24 11"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="11" r="2" className="fill-primary-foreground" />
    </svg>
  );
}
