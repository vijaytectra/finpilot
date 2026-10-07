import { Pnl } from "@/components/pnl";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatInteger, formatMoney, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { AccountValuation } from "../types";

const statusTone = (status: AccountValuation["status"]): StatusTone => (status === "ACTIVE" ? "positive" : "neutral");

export function AccountCards({ accounts }: { accounts: AccountValuation[] }) {
  if (accounts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        This customer has no accounts.
      </p>
    );
  }
  return (
    <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {accounts.map((a) => (
        <li key={a.account_id}>
          <Card className={cn("h-full", a.status === "CLOSED" && "opacity-75")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                {humanizeEnum(a.account_type)}
                <StatusDot tone={statusTone(a.status)} className="ml-auto font-normal text-muted-foreground">
                  {humanizeEnum(a.status)}
                </StatusDot>
              </CardTitle>
              <CardDescription className="text-xs">
                <span className="font-mono">{a.account_id}</span> · {a.provider} · opened {formatDate(a.opened_at)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Market value</dt>
                  <dd className="tabular font-semibold">{formatMoney(a.market_value)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Invested</dt>
                  <dd className="tabular">{formatMoney(a.cost_basis)}</dd>
                </div>
                <div className="col-span-2 flex items-baseline justify-between gap-2 border-t pt-2">
                  <dt className="text-xs text-muted-foreground">
                    Unrealised P/L · {formatInteger(a.positions)} {a.positions === 1 ? "position" : "positions"}
                  </dt>
                  <dd>
                    <Pnl amount={a.unrealized_pnl} percent={a.unrealized_pnl_pct} className="text-sm" />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
