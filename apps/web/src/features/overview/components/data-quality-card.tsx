"use client";

import { CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsAdmin } from "@/features/auth/hooks";
import { formatInteger, humanizeEnum } from "@/lib/format";

import type { ExceptionCount } from "../types";

const TYPE_COPY: Record<string, { title: string; description: string }> = {
  IMPORT_REJECTED: {
    title: "Rejected at import",
    description: "Rows that failed validation and were not loaded.",
  },
  RECONCILIATION: {
    title: "Reconciliation flags",
    description: "Loaded records that break a business rule and need review.",
  },
};

export function DataQualityCard({ exceptions }: { exceptions: ExceptionCount[] }) {
  const isAdmin = useIsAdmin();
  const groups = new Map<string, ExceptionCount[]>();
  for (const e of exceptions) {
    groups.set(e.exception_type, [...(groups.get(e.exception_type) ?? []), e]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-muted-foreground" aria-hidden />
          Data quality
        </CardTitle>
        <CardDescription>Exceptions found while loading and reconciling source data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {exceptions.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-positive" aria-hidden /> No data-quality exceptions recorded.
          </p>
        ) : (
          [...groups.entries()].map(([type, rows]) => {
            const copy = TYPE_COPY[type] ?? { title: humanizeEnum(type), description: "" };
            return (
              <section key={type} aria-labelledby={`dq-${type}`} className="space-y-2">
                <div>
                  <h3 id={`dq-${type}`} className="text-sm font-medium">
                    {copy.title}
                  </h3>
                  {copy.description ? <p className="text-xs text-muted-foreground">{copy.description}</p> : null}
                </div>
                <ul className="divide-y rounded-md border">
                  {rows.map((r) => (
                    <li key={`${r.entity}-${r.rule}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate">{humanizeEnum(r.rule)}</span>
                        <span className="text-xs text-muted-foreground">{humanizeEnum(r.entity)}</span>
                      </span>
                      <Badge variant="secondary" className="tabular">
                        {formatInteger(r.count)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
        {isAdmin ? (
          <Link href="/admin/import" className="inline-block text-sm font-medium text-primary hover:underline">
            Review import history
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
