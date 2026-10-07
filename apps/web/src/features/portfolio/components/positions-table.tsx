"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { ASSET_CLASS_COLOR, assetClassLabel } from "@/components/charts/asset-class";
import { Pnl } from "@/components/pnl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { Position } from "../types";

type SortKey = "symbol" | "market_value" | "unrealized_pnl" | "weight_pct";
interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Client-side ordering of an already-loaded, per-customer list (no arithmetic, comparison only). */
export function sortPositions(positions: Position[], sort: SortState): Position[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...positions].sort((a, b) => {
    if (sort.key === "symbol") return a.symbol.localeCompare(b.symbol) * factor;
    return (a[sort.key] - b[sort.key]) * factor;
  });
}

function SortButton({
  label,
  column,
  sort,
  onSort,
  align = "right",
}: {
  label: string;
  column: SortKey;
  sort: SortState;
  onSort: (s: SortState) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() =>
        onSort({ key: column, dir: active ? (sort.dir === "asc" ? "desc" : "asc") : column === "symbol" ? "asc" : "desc" })
      }
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        align === "right" && "flex-row-reverse",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
    </button>
  );
}

function ariaSort(sort: SortState, column: SortKey): "ascending" | "descending" | "none" {
  if (sort.key !== column) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
}

interface PositionsViewProps {
  positions: Position[];
  showAccount: boolean;
  snapshotPriceDate?: string | null;
}

export function PositionsView({ positions, showAccount, snapshotPriceDate }: PositionsViewProps) {
  const [sort, setSort] = useState<SortState>({ key: "market_value", dir: "desc" });
  const rows = useMemo(() => sortPositions(positions, sort), [positions, sort]);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead aria-sort={ariaSort(sort, "symbol")} className="pl-5">
                <SortButton label="Instrument" column="symbol" sort={sort} onSort={setSort} align="left" />
              </TableHead>
              {showAccount ? <TableHead>Account</TableHead> : null}
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Avg cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead aria-sort={ariaSort(sort, "market_value")} className="text-right">
                <SortButton label="Value" column="market_value" sort={sort} onSort={setSort} />
              </TableHead>
              <TableHead aria-sort={ariaSort(sort, "unrealized_pnl")} className="text-right">
                <SortButton label="Unrealised P/L" column="unrealized_pnl" sort={sort} onSort={setSort} />
              </TableHead>
              <TableHead aria-sort={ariaSort(sort, "weight_pct")} className="pr-5 text-right">
                <SortButton label="Weight" column="weight_pct" sort={sort} onSort={setSort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={`${p.account_id}-${p.instrument_id}`}>
                <TableCell className="max-w-72 pl-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: ASSET_CLASS_COLOR[p.asset_class] }}
                      aria-hidden
                    />
                    <span className="font-mono text-[13px] font-medium">{p.symbol}</span>
                    <span className="text-[12px] text-muted-foreground">{assetClassLabel(p.asset_class)}</span>
                  </div>
                  <span className="block truncate pl-4 text-[12px] text-muted-foreground">
                    {p.instrument_name}
                    {p.sector ? ` · ${p.sector}` : ""}
                  </span>
                </TableCell>
                {showAccount ? <TableCell className="font-mono text-[12px] text-muted-foreground">{p.account_id}</TableCell> : null}
                <TableCell className="tabular text-right">{formatQuantity(p.quantity)}</TableCell>
                <TableCell className="tabular text-right">{formatMoney(p.avg_cost)}</TableCell>
                <TableCell className="tabular text-right">
                  {formatMoney(p.last_price)}
                  {snapshotPriceDate && p.price_as_of !== snapshotPriceDate ? (
                    <span className="block text-[11px] text-warning">as of {formatDate(p.price_as_of)}</span>
                  ) : null}
                </TableCell>
                <TableCell className="tabular text-right font-medium">{formatMoney(p.market_value)}</TableCell>
                <TableCell className="text-right">
                  <Pnl amount={p.unrealized_pnl} />
                  <Pnl percent={p.unrealized_pnl_pct} percentOnly className="block text-[12px] font-normal" iconClassName="hidden" />
                </TableCell>
                <TableCell className="tabular pr-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {formatPercent(p.weight_pct)}
                    <span className="hidden h-1.5 w-12 rounded-full bg-muted sm:block" aria-hidden>
                      <span
                        className="block h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.min(p.weight_pct, 100)}%` }}
                      />
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-2 px-5 md:hidden">
        {rows.map((p) => (
          <li key={`${p.account_id}-${p.instrument_id}`} className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="size-2 rounded-sm" style={{ background: ASSET_CLASS_COLOR[p.asset_class] }} aria-hidden />
                  {p.symbol}
                  <span className="text-xs font-normal text-muted-foreground">{assetClassLabel(p.asset_class)}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{p.instrument_name}</p>
              </div>
              <div className="text-right">
                <p className="tabular font-semibold">{formatMoney(p.market_value)}</p>
                <p className="tabular text-xs text-muted-foreground">{formatPercent(p.weight_pct)} of portfolio</p>
              </div>
            </div>
            <dl className="tabular mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Qty</dt>
                <dd>{formatQuantity(p.quantity)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Avg cost</dt>
                <dd>{formatMoney(p.avg_cost)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd>{formatMoney(p.last_price)}</dd>
              </div>
            </dl>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">{showAccount ? p.account_id : "Unrealised P/L"}</span>
              <Pnl amount={p.unrealized_pnl} percent={p.unrealized_pnl_pct} className="text-xs" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
