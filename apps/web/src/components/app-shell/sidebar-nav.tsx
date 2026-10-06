"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMe } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";

import { NAV_SECTIONS } from "./nav-config";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: user } = useMe();
  const isAdmin = user?.role === "ADMIN";

  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {NAV_SECTIONS.map((section, index) => {
        const items = section.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={section.label ?? index} className="space-y-1">
            {section.label ? (
              <p className="px-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                {section.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
