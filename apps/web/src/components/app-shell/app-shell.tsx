"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { GlobalSearchIconTrigger, GlobalSearchProvider, GlobalSearchTrigger } from "./global-search";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Logo className="size-7" />
      <span className="text-base font-semibold tracking-tight">FinPilot</span>
    </Link>
  );
}

/** Desktop: fixed sidebar + header with search. Mobile: top bar with a Sheet menu. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <GlobalSearchProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>
        <div className="border-t p-2">
          <UserMenu />
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
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

          <div className="lg:hidden">
            <Brand />
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:flex-1">
            <GlobalSearchTrigger className="hidden md:flex" />
            <div className="md:hidden">
              <GlobalSearchIconTrigger />
            </div>
          </div>
          <div className="lg:hidden">
            <UserMenu compact />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 py-6 outline-none sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </GlobalSearchProvider>
  );
}
