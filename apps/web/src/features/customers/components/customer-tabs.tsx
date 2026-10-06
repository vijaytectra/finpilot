"use client";

import { ArrowLeftRight, LayoutGrid, PieChart, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { segment: "", label: "Overview", icon: LayoutGrid },
  { segment: "portfolio", label: "Portfolio", icon: PieChart },
  { segment: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { segment: "goals", label: "Goals", icon: Target },
] as const;

/**
 * Tabs are real routes (deep-linkable, back-button friendly), so they are rendered as a
 * navigation landmark with aria-current rather than an ARIA tablist.
 */
export function CustomerTabs({ customerId }: { customerId: string }) {
  const pathname = usePathname();
  const base = `/customers/${customerId}`;

  return (
    <nav aria-label="Customer sections" className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = tab.segment ? pathname.startsWith(href) : pathname === base;
          const Icon = tab.icon;
          return (
            <li key={tab.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 rounded-t-md px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full",
                  active
                    ? "text-foreground after:bg-primary"
                    : "text-muted-foreground hover:text-foreground after:bg-transparent",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
