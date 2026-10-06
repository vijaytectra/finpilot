import { AlertTriangle, CopyCheck, FileText, PlusCircle, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatBytes, formatDateTime, formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ImportBatch } from "../types";
import { ImportStatusBadge } from "./import-status-badge";

const TILES = [
  {
    key: "total_rows",
    label: "Rows in file",
    icon: FileText,
    explain: "Data rows read from the CSV, excluding the header.",
    tone: "",
  },
  {
    key: "inserted_rows",
    label: "Inserted",
    icon: PlusCircle,
    explain: "New transactions written to the ledger.",
    tone: "text-positive",
  },
  {
    key: "duplicate_rows",
    label: "Duplicates skipped",
    icon: CopyCheck,
    explain: "Identical to records already stored, so re-uploading a file is safe.",
    tone: "text-info",
  },
  {
    key: "rejected_rows",
    label: "Rejected",
    icon: XCircle,
    explain: "Failed validation and were not imported. Each is listed below with its reason.",
    tone: "text-negative",
  },
] as const;

/** Outcome of one import batch. `live` announces it to screen readers (fresh upload). */
export function ImportSummary({ batch, live = false }: { batch: ImportBatch; live?: boolean }) {
  return (
    <section aria-labelledby="import-summary-heading" aria-live={live ? "polite" : undefined} className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="import-summary-heading" className="text-base font-semibold">
          {batch.filename}
        </h2>
        <ImportStatusBadge status={batch.status} />
        <p className="w-full text-xs text-muted-foreground">
          {batch.source === "SEED" ? "Seed load" : "Upload"}
          {batch.uploaded_by ? ` by ${batch.uploaded_by}` : ""} · {formatDateTime(batch.started_at)} ·{" "}
          {formatBytes(batch.file_bytes)}
        </p>
      </div>

      {batch.status === "FAILED" ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>The file was not imported</AlertTitle>
          <AlertDescription>{batch.error_message ?? "The import failed. No rows were written."}</AlertDescription>
        </Alert>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.key} className="rounded-lg border bg-card p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className={cn("size-3.5", tile.tone)} aria-hidden />
                {tile.label}
              </dt>
              <dd className="mt-1 space-y-1">
                <span className={cn("tabular block text-2xl font-semibold", batch[tile.key] > 0 && tile.tone)}>
                  {formatInteger(batch[tile.key])}
                </span>
                <span className="block text-xs text-muted-foreground">{tile.explain}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
