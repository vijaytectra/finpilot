import { API_BASE, ApiError, apiFetch, toApiError } from "@/lib/api/client";

import type { ImportBatch, ImportBatchPage, ImportErrorPage, ImportReport } from "./types";

/**
 * Multipart upload via XHR rather than fetch, because fetch exposes no upload progress.
 * Errors are normalised through the same envelope parser as apiFetch.
 */
export function uploadTransactions(file: File, onProgress?: (fraction: number) => void): Promise<ImportReport> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/admin/imports/transactions`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () =>
      reject(new ApiError({ status: 0, code: "NETWORK_ERROR", message: "The upload was interrupted. Check your connection and try again." }));
    xhr.onload = async () => {
      const headers = new Headers();
      const requestId = xhr.getResponseHeader("x-request-id");
      if (requestId) headers.set("x-request-id", requestId);
      const response = new Response(xhr.responseText || null, { status: xhr.status, headers });
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((await response.json()) as ImportReport);
        } catch {
          reject(new ApiError({ status: xhr.status, code: "BAD_RESPONSE", message: "Unexpected response from the server." }));
        }
      } else {
        reject(await toApiError(response));
      }
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export const importsApi = {
  history: (page: number, signal?: AbortSignal) =>
    apiFetch<ImportBatchPage>("/admin/imports", { query: { page, page_size: 10 }, signal }),
  batch: (batchId: string, signal?: AbortSignal) =>
    apiFetch<ImportBatch>(`/admin/imports/${encodeURIComponent(batchId)}`, { signal }),
  errors: (batchId: string, page: number, signal?: AbortSignal) =>
    apiFetch<ImportErrorPage>(`/admin/imports/${encodeURIComponent(batchId)}/errors`, {
      query: { page, page_size: 25 },
      signal,
    }),
};
