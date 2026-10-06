"use client";

import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useMe } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Signed-in user + role, theme switch and sign-out. `compact` renders only the avatar. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: user, isPending } = useMe();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();

  if (isPending || !user) {
    return compact ? (
      <Skeleton className="size-8 rounded-full" />
    ) : (
      <div className="flex items-center gap-2 p-2" aria-hidden>
        <Skeleton className="size-8 rounded-full" />
        <div className="hidden flex-1 space-y-1.5 xl:block">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    );
  }

  const roleLabel = user.role === "ADMIN" ? "Admin" : "Viewer";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3",
          compact
            ? "rounded-full focus-visible:ring-ring/50"
            : "w-full justify-center p-2 text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-sidebar-ring xl:justify-start",
        )}
        aria-label={`Account menu for ${user.full_name}`}
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {initials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        {compact ? null : (
          <>
            <span className="hidden min-w-0 flex-1 xl:block">
              <span className="block truncate text-sm font-medium text-white">{user.full_name}</span>
              <span className="block truncate text-xs text-sidebar-foreground/70">{roleLabel}</span>
            </span>
            <ChevronsUpDown className="hidden size-4 text-sidebar-foreground/70 xl:block" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-60">
        <DropdownMenuLabel className="space-y-1 font-normal">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-foreground">{user.full_name}</span>
            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{roleLabel}</Badge>
          </div>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut aria-hidden />
          {logout.isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
