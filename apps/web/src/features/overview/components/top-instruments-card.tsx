import { assetClassLabel, ASSET_CLASS_COLOR } from "@/components/charts/asset-class";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger } from "@/lib/format";

import type { InstrumentHolders } from "../types";

/** Keep the overview compact: the five most widely held instruments. */
const MAX_ROWS = 5;

export function TopInstrumentsCard({ instruments }: { instruments: InstrumentHolders[] }) {
  const shown = instruments.slice(0, MAX_ROWS);
  const maxHolders = Math.max(1, ...shown.map((i) => i.holders));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most widely held</CardTitle>
        <CardDescription>Instruments by number of customers holding them</CardDescription>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No holdings in the current snapshot.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Holders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((i) => (
                <TableRow key={i.instrument_id}>
                  <TableCell className="max-w-0 min-w-0 sm:w-1/2">
                    <span className="block truncate font-mono text-[13px] font-medium">{i.symbol}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.instrument_name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-[13px]">
                      <span className="size-2 shrink-0 rounded-sm" style={{ background: ASSET_CLASS_COLOR[i.asset_class] }} aria-hidden />
                      {assetClassLabel(i.asset_class)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      <span className="tabular font-medium">{formatInteger(i.holders)}</span>
                      <span className="hidden h-1.5 w-[120px] shrink-0 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
                        <span
                          className="block h-full rounded-full bg-primary/70"
                          style={{ width: `${(i.holders / maxHolders) * 100}%` }}
                        />
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
