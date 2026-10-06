"use client";

import { ArrowRight, Loader2, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCustomers } from "@/features/customers/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SearchContextValue {
  open: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

function useSearchContext(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("GlobalSearch triggers must be rendered inside <GlobalSearchProvider>");
  return ctx;
}

/** Owns the ⌘/Ctrl+K palette so there is exactly one dialog and one keyboard listener. */
export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <CustomerSearchDialog open={isOpen} onOpenChange={setIsOpen} />
    </SearchContext.Provider>
  );
}

function CustomerSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term.trim(), 250);
  const enabled = open && debounced.length > 0;
  const { data, isFetching, isError } = useCustomers(
    { search: debounced, sort: "full_name", page: 1, page_size: 8 },
    { enabled },
  );

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setTerm("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  const results = enabled ? (data?.items ?? []) : [];
  const total = enabled ? (data?.pagination.total ?? 0) : 0;
  const settled = enabled && !isFetching && debounced === term.trim();

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTerm("");
      }}
      title="Search customers"
      description="Search by name, customer ID, email or city"
    >
      <Command shouldFilter={false} loop>
        <CommandInput
          value={term}
          onValueChange={setTerm}
          placeholder="Search customers by name, ID, email or city…"
          aria-label="Search customers"
        />
        <CommandList>
          {!enabled ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Start typing to search across all customers.
            </p>
          ) : null}
          {enabled && isFetching && results.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Searching…
            </p>
          ) : null}
          {enabled && isError ? (
            <p className="px-3 py-6 text-center text-sm text-negative" role="alert">
              Search is unavailable right now. Please try again.
            </p>
          ) : null}
          {settled && !isError ? <CommandEmpty>No customers match “{debounced}”.</CommandEmpty> : null}

          {results.length > 0 ? (
            <CommandGroup heading={`Customers${total > results.length ? ` · top ${results.length} of ${total}` : ""}`}>
              {results.map((customer) => (
                <CommandItem
                  key={customer.customer_id}
                  value={customer.customer_id}
                  onSelect={() => go(`/customers/${customer.customer_id}`)}
                  className={cn(isFetching && "opacity-70")}
                >
                  <UserRound aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{customer.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {customer.customer_id} · {customer.city}, {customer.state}
                    </span>
                  </span>
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    {customer.segment}
                  </Badge>
                  <span className="tabular hidden w-20 text-right text-xs text-muted-foreground sm:block">
                    {formatMoneyCompact(customer.aum)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {enabled && total > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => go(`/customers?search=${encodeURIComponent(debounced)}`)}
                >
                  <ArrowRight aria-hidden />
                  See all {total} results in Customers
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/** Wide search button for the desktop header. */
export function GlobalSearchTrigger({ className }: { className?: string }) {
  const { open } = useSearchContext();
  return (
    <Button
      variant="outline"
      onClick={open}
      className={cn("h-9 w-full justify-start gap-2 px-3 font-normal text-muted-foreground sm:w-72", className)}
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search aria-hidden />
      <span className="flex-1 text-left">Search customers…</span>
      <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-block">
        Ctrl K
      </kbd>
    </Button>
  );
}

/** Icon-only trigger for the mobile top bar. */
export function GlobalSearchIconTrigger() {
  const { open } = useSearchContext();
  return (
    <Button variant="ghost" size="icon" onClick={open} aria-label="Search customers">
      <Search aria-hidden />
    </Button>
  );
}
