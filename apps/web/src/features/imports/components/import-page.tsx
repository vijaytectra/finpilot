"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/hooks";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { isApiError } from "@/lib/api/client";
import { pluralize } from "@/lib/format";

import { useImportBatch, useUploadTransactions } from "../hooks";
import { ImportErrorsTable } from "./import-errors-table";
import { ImportHistory } from "./import-history";
import { ImportSummary } from "./import-summary";
import { UploadDropzone } from "./upload-dropzone";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function positivePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function ImportPage() {
  const { data: user, isPending } = useMe();

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (user?.role !== "ADMIN") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admins only"
        description="Importing transactions requires the ADMIN role. Ask an administrator if you need data loaded."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to overview</Link>
          </Button>
        }
        className="mt-6"
      />
    );
  }
  return <AdminImport />;
}

function AdminImport() {
  const searchParams = useSearchParams();
  const update = useSearchParamsUpdater();
  const batchParam = searchParams.get("batch");
  const batchId = batchParam && UUID.test(batchParam) ? batchParam : null;
  const errorsPage = positivePage(searchParams.get("errors_page"));
  const historyPage = positivePage(searchParams.get("history_page"));

  const [progress, setProgress] = useState(0);
  const [freshId, setFreshId] = useState<string | null>(null);
  const upload = useUploadTransactions(setProgress);
  const batch = useImportBatch(batchId);

  const onUpload = (file: File) => {
    setProgress(0);
    upload.mutate(file, {
      onSuccess: (report) => {
        setFreshId(report.id);
        update({ batch: report.id, errors_page: null, history_page: null });
        toast.success("Import finished", {
          description: `${pluralize(report.inserted_rows, "row")} inserted, ${report.duplicate_rows} duplicates, ${report.rejected_rows} rejected`,
        });
      },
    });
  };

  // Structural rejections (413/415/422) refuse the whole file; show the API's reason.
  const uploadError = upload.isError ? upload.error : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import transactions"
        description="Validate and load a transactions CSV. Valid rows are imported, exact duplicates are skipped and invalid rows are rejected with a reason."
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload file</CardTitle>
          <CardDescription>
            Header must match the transactions.csv layout. Re-uploading the same file is safe: unchanged rows count as
            duplicates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadDropzone key={freshId ?? "initial"} onUpload={onUpload} uploading={upload.isPending} progress={progress} />
          {uploadError ? (
            <ErrorState
              error={uploadError}
              title={
                isApiError(uploadError) && [413, 415, 422].includes(uploadError.status)
                  ? "The file was refused"
                  : undefined
              }
              compact
            />
          ) : null}
        </CardContent>
      </Card>

      {batchId ? (
        <Card>
          <CardHeader>
            <CardTitle>{batchId === freshId ? "Import result" : "Import details"}</CardTitle>
            <CardDescription className="font-mono text-xs">Batch {batchId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {batch.isPending ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : batch.isError ? (
              <ErrorState error={batch.error} onRetry={() => void batch.refetch()} isRetrying={batch.isRefetching} compact />
            ) : (
              <>
                <ImportSummary batch={batch.data} live={batchId === freshId} />
                <section aria-labelledby="rejected-heading" className="space-y-3">
                  <h3 id="rejected-heading" className="text-sm font-semibold">
                    Rejected rows
                  </h3>
                  <ImportErrorsTable
                    batchId={batchId}
                    rejected={batch.data.rejected_rows}
                    page={errorsPage}
                    onPageChange={(p) => update({ errors_page: p === 1 ? null : p })}
                  />
                </section>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
          <CardDescription>Seed loads and uploads, newest first. Select one to see its rejected rows.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportHistory
            page={historyPage}
            selectedId={batchId}
            onPageChange={(p) => update({ history_page: p === 1 ? null : p })}
            onSelect={(id) => update({ batch: id, errors_page: null })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
