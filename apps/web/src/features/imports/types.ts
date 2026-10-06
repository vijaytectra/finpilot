import type { components } from "@/lib/api/schema";

export type ImportReport = components["schemas"]["ImportReport"];
export type ImportBatch = components["schemas"]["ImportBatchOut"];
export type ImportBatchPage = components["schemas"]["ImportBatchPage"];
export type ImportRowError = components["schemas"]["ImportRowErrorOut"];
export type ImportErrorPage = components["schemas"]["ImportErrorPage"];
export type ImportStatus = components["schemas"]["ImportStatus"];

/** Mirrors the API's IMPORT_MAX_BYTES default (25 MB); the server remains authoritative. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
