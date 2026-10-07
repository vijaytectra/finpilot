import { AlertTriangle } from "lucide-react";

import { StatStrip } from "@/components/stat-strip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatBytes, formatDateTime, formatInteger } from "@/lib/format";

import type { ImportBatch } from "../types";
import { ImportStatusBadge } from "./import-status-badge";

const TILES = [
  { key: "total_rows", label: "Rows in file", explain: "Data rows read from the CSV, excluding the header." },
  { key: "inserted_rows", label: "Inserted", explain: "New transactions written to the ledger." },
  {
    key: "duplicate_rows",
    label: "Duplicates skipped",
    explain: "Identical to records already stored, so re-uploading a file is safe.",
  },
  {
    key: "rejected_rows",
    label: "Rejected",
    explain: "Failed validation and were not imported. Each is listed below with its reason.",
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

      <StatStrip
        label="Import result"
        items={TILES.map((tile) => ({
          label: tile.label,
          value: formatInteger(batch[tile.key]),
          hint: tile.explain,
          title: tile.explain,
        }))}
      />
    </section>
  );
}
