"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { GlobalSearchIconTrigger, GlobalSearchProvider, GlobalSearchTrigger } from "./global-search";
import { currentNavLabel } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

function Brand({ tone = "light" }: { tone?: "light" | "sidebar" }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-md outline-none focus-visible:ring-3",
        tone === "sidebar" && "text-foreground",
        "focus-visible:ring-ring/50",
      )}
    >
      <Logo className="size-7 shrink-0" />
      <span
        className={cn(
          "text-base font-semibold tracking-tight",
          tone === "sidebar" && "sr-only xl:not-sr-only",
        )}
      >
        FinPilot
      </span>
    </Link>
  );
}

/** Desktop: fixed sidebar + header with search. Mobile: top bar with a Sheet menu. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <GlobalSearchProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-16 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex xl:w-60">
        <div className="flex h-14 items-center justify-center border-b border-sidebar-border px-3 xl:justify-start xl:px-5">
          <Brand tone="sidebar" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav variant="rail" />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <UserMenu />
        </div>
      </aside>

      <div className="md:pl-16 xl:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b">
                <SheetTitle asChild>
                  <div>
                    <Brand />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">Main navigation</SheetDescription>
              </SheetHeader>
              <div className="px-3">
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="md:hidden">
            <Brand />
          </div>

          <p className="hidden truncate text-sm font-medium md:block">{currentNavLabel(pathname)}</p>

          <div className="ml-auto flex items-center gap-1.5">
            <GlobalSearchTrigger className="hidden w-60 md:flex" />
            <div className="md:hidden">
              <GlobalSearchIconTrigger />
            </div>
            <ThemeToggle />
            <div className="md:hidden">
              <UserMenu compact />
            </div>
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1360px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </GlobalSearchProvider>
  );
}
