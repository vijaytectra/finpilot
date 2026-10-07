"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMe } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";

import { NAV_SECTIONS } from "./nav-config";

/**
 * `rail`: the light desktop sidebar — icon-only at 768–1279 px (labels stay in the
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
          <div key={section.label ?? index} className={cn("space-y-1", rail && index > 0 && "border-t border-sidebar-border pt-4 xl:border-0 xl:pt-0")}>
            {section.label ? (
              <p
                className={cn(
                  "px-3 pb-1.5 text-xs font-medium text-muted-foreground",
                  rail && "hidden xl:block",
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
                        "relative flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        rail
                          ? [
                              "justify-center xl:justify-start",
                              active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-3 before:w-0.5 before:rounded-full before:bg-sidebar-primary"
                                : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                            ]
                          : [
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
