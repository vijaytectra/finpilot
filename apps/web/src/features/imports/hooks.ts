"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { overviewKeys } from "@/features/overview/hooks";

import { importsApi, uploadTransactions } from "./api";
import type { ImportBatch, ImportReport } from "./types";

export const importKeys = {
  all: ["imports"] as const,
  history: (page: number) => [...importKeys.all, "history", page] as const,
  batch: (batchId: string) => [...importKeys.all, "batch", batchId] as const,
  errors: (batchId: string, page: number) => [...importKeys.all, "errors", batchId, page] as const,
};

export function useImportHistory(page: number) {
  return useQuery({
    queryKey: importKeys.history(page),
    queryFn: ({ signal }) => importsApi.history(page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useImportBatch(batchId: string | null) {
  return useQuery({
    queryKey: importKeys.batch(batchId ?? ""),
    queryFn: ({ signal }) => importsApi.batch(batchId as string, signal),
    enabled: batchId !== null,
  });
}

export function useImportErrors(batchId: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: importKeys.errors(batchId, page),
    queryFn: ({ signal }) => importsApi.errors(batchId, page, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUploadTransactions(onProgress: (fraction: number) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadTransactions(file, onProgress),
    onSuccess: (report) => {
      // The report is a superset of the batch shape: seed the detail cache, refresh the rest.
      queryClient.setQueryData<ImportBatch>(importKeys.batch(report.id), reportToBatch(report));
      void queryClient.invalidateQueries({ queryKey: [...importKeys.all, "history"] });
      void queryClient.invalidateQueries({ queryKey: overviewKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

function reportToBatch(report: ImportReport): ImportBatch {
  return {
    id: report.id,
    kind: report.kind,
    source: report.source,
    status: report.status,
    filename: report.filename,
    file_sha256: report.file_sha256,
    file_bytes: report.file_bytes,
    uploaded_by: report.uploaded_by,
    total_rows: report.total_rows,
    inserted_rows: report.inserted_rows,
    duplicate_rows: report.duplicate_rows,
    rejected_rows: report.rejected_rows,
    error_message: report.error_message,
    started_at: report.started_at,
    completed_at: report.completed_at,
  };
}