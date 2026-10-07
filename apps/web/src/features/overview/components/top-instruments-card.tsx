import { assetClassLabel, ASSET_CLASS_COLOR } from "@/components/charts/asset-class";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger } from "@/lib/format";

import type { InstrumentHolders } from "../types";

/** Keep the overview compact: the five most widely held instruments. */
const MAX_ROWS = 5;

export function TopInstrumentsCard({ instruments }: { instruments: InstrumentHolders[] }) {
  const shown = instruments.slice(0, MAX_ROWS);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most widely held</CardTitle>
        <CardDescription>Instruments by number of customers holding them</CardDescription>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No holdings in the current snapshot.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead className="hidden sm:table-cell lg:hidden xl:table-cell">Class</TableHead>
                <TableHead className="text-right">Holders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((i) => (
                <TableRow key={i.instrument_id}>
                  <TableCell className="max-w-0 min-w-0">
                    <span className="block truncate font-medium">{i.symbol}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.instrument_name}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell lg:hidden xl:table-cell">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="size-2 rounded-sm" style={{ background: ASSET_CLASS_COLOR[i.asset_class] }} aria-hidden />
                      {assetClassLabel(i.asset_class)}
                    </span>
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">{formatInteger(i.holders)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
