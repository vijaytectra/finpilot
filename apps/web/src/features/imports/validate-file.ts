import { formatBytes } from "@/lib/format";

import { MAX_UPLOAD_BYTES } from "./types";

/** Fast client-side checks before uploading; the API re-validates everything. */
export function validateCsvFile(file: Pick<File, "name" | "size">): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files can be imported.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `This file is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}
