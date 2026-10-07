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
    <nav aria-label="Customer sections" className="flex gap-6 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = tab.segment ? pathname.startsWith(href) : pathname === base;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px flex h-10 shrink-0 items-center gap-2 rounded-t-sm border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "border-primary text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
