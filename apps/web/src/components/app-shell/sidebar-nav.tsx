"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMe } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";

import { NAV_SECTIONS } from "./nav-config";

/**
 * `rail`: the navy desktop sidebar — icon-only at 768–1279 px (labels stay in the
 * accessibility tree via sr-only), icon + label from 1280 px.
 * `sheet`: the light slide-out menu used on phones.
 */
export function SidebarNav({
  onNavigate,
  variant = "sheet",
}: {
  onNavigate?: () => void;
  variant?: "rail" | "sheet";
}) {
  const pathname = usePathname();
  const { data: user } = useMe();
  const isAdmin = user?.role === "ADMIN";
  const rail = variant === "rail";

  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {NAV_SECTIONS.map((section, index) => {
        const items = section.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={section.label ?? index} className="space-y-1">
            {section.label ? (
              <p
                className={cn(
                  "px-3 pb-1 text-[11px] font-medium tracking-wider uppercase",
                  rail ? "hidden text-sidebar-foreground/60 xl:block" : "text-muted-foreground",
                )}
              >
                {section.label}
              </p>
            ) : null}
            <ul className="space-y-1">
              {items.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={rail ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3",
                        rail
                          ? [
                              "justify-center focus-visible:ring-sidebar-ring/60 xl:justify-start",
                              active
                                ? "bg-sidebar-primary text-sidebar-primary-foreground before:absolute before:inset-y-1.5 before:-left-3 before:w-1 before:rounded-r before:bg-sidebar-ring"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            ]
                          : [
                              "focus-visible:ring-ring/50",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground",
                            ],
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className={rail ? "sr-only xl:not-sr-only" : undefined}>{item.label}</span>
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
