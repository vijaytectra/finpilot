"use client";

import { BarChart3, Table2 } from "lucide-react";

import { NetFlowsChart } from "@/components/charts/net-flows-chart";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatInteger, formatMoney, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { MonthlyFlow } from "../types";

export function NetFlowsCard({ flows }: { flows: MonthlyFlow[] }) {
  return (
    <Card>
      <Tabs defaultValue="chart" className="gap-0">
        <CardHeader>
          <CardTitle>Net flows</CardTitle>
          <CardDescription>Buys minus sells per month, last 12 months (settled and pending)</CardDescription>
          <CardAction>
            <TabsList aria-label="Net flows view">
              <TabsTrigger value="chart">
                <BarChart3 aria-hidden /> Chart
              </TabsTrigger>
              <TabsTrigger value="table">
                <Table2 aria-hidden /> Table
              </TabsTrigger>
            </TabsList>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4">
          {flows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No trades in the last 12 months.</p>
          ) : (
            <>
              <TabsContent value="chart">
                <NetFlowsChart data={flows} />
              </TabsContent>
              <TabsContent value="table">
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Buys</TableHead>
                        <TableHead className="text-right">Sells</TableHead>
                        <TableHead className="text-right">Net invested</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flows.map((f) => (
                        <TableRow key={f.month}>
                          <TableCell>{formatMonth(f.month)}</TableCell>
                          <TableCell className="tabular text-right">{formatMoney(f.buy_amount)}</TableCell>
                          <TableCell className="tabular text-right">{formatMoney(f.sell_amount)}</TableCell>
                          <TableCell className={cn("tabular text-right font-medium", f.net_invested < 0 && "text-negative")}>
                            {formatMoney(f.net_invested)}
                          </TableCell>
                          <TableCell className="tabular text-right">{formatInteger(f.trades)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}
