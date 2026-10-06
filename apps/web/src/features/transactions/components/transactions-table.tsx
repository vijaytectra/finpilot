import { assetClassLabel } from "@/components/charts/asset-class";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { Transaction } from "../types";
import { TransactionStatusBadge, TransactionTypeBadge, transactionRowClass } from "./transaction-badges";

interface TransactionsTableProps {
  transactions: Transaction[];
  showAccount: boolean;
  isStale?: boolean;
}

export function TransactionsTable({ transactions, showAccount, isStale }: TransactionsTableProps) {
  return (
    <>
      <div className={cn("hidden overflow-x-auto transition-opacity md:block", isStale && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trade date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Instrument</TableHead>
              {showAccount ? <TableHead>Account</TableHead> : null}
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.transaction_id} className={transactionRowClass(t.status)} data-status={t.status}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(t.trade_date)}
                  <span className="block font-mono text-[11px] text-muted-foreground">{t.transaction_id}</span>
                </TableCell>
                <TableCell>
                  <TransactionTypeBadge type={t.transaction_type} />
                </TableCell>
                <TableCell className="max-w-64">
                  <span className="block truncate font-medium">{t.symbol}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.instrument_name} · {assetClassLabel(t.asset_class)}
                  </span>
                </TableCell>
                {showAccount ? <TableCell className="font-mono text-xs">{t.account_id}</TableCell> : null}
                <TableCell className="tabular text-right">{formatQuantity(t.quantity)}</TableCell>
                <TableCell className="tabular text-right">{formatMoney(t.price)}</TableCell>
                <TableCell className="tabular text-right font-medium">
                  <span data-amount>{formatMoney(t.amount)}</span>
                  {t.status === "REVERSED" ? <span className="sr-only"> (reversed, not counted)</span> : null}
                </TableCell>
                <TableCell>
                  <TransactionStatusBadge status={t.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className={cn("space-y-2 transition-opacity md:hidden", isStale && "opacity-60")}>
        {transactions.map((t) => (
          <li
            key={t.transaction_id}
            className={cn("rounded-lg border bg-card p-3", transactionRowClass(t.status))}
            data-status={t.status}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <TransactionTypeBadge type={t.transaction_type} />
                  <span className="truncate font-medium">{t.symbol}</span>
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{t.instrument_name}</p>
              </div>
              <div className="text-right">
                <p className="tabular font-semibold" data-amount>
                  {formatMoney(t.amount)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(t.trade_date)}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-xs">
              <span className="tabular text-muted-foreground">
                {formatQuantity(t.quantity)} @ {formatMoney(t.price)}
                {showAccount ? ` · ${t.account_id}` : ""}
              </span>
              <TransactionStatusBadge status={t.status} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
