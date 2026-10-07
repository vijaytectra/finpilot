"use client";

import { FileSpreadsheet, Loader2, UploadCloud, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

import { MAX_UPLOAD_BYTES } from "../types";
import { validateCsvFile } from "../validate-file";

interface UploadDropzoneProps {
  onUpload: (file: File) => void;
  uploading: boolean;
  /** 0–1 while the request body is being sent. */
  progress: number;
}

export function UploadDropzone({ onUpload, uploading, progress }: UploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const choose = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validateCsvFile(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  };

  const sent = Math.round(progress * 100);

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) choose(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed bg-card px-6 py-10 text-center transition-colors",
          "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
          dragging ? "border-primary bg-accent/40" : "hover:border-primary hover:bg-accent/40",
          uploading && "pointer-events-none opacity-70",
          error && "border-destructive/50",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UploadCloud className="size-5" aria-hidden />
        </span>
        <span className="space-y-1">
          <span className="block text-sm font-medium">
            Drag a CSV here, or <span className="text-primary underline underline-offset-4">browse</span>
          </span>
          <span className="block text-xs text-muted-foreground">
            transactions.csv format, UTF-8, up to {formatBytes(MAX_UPLOAD_BYTES)}
          </span>
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={uploading}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {file ? (
        <div className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:items-center">
          <FileSpreadsheet className="hidden size-5 shrink-0 text-muted-foreground sm:block" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-sm font-medium">{file.name}</p>
            {uploading ? (
              <div className="space-y-1">
                <Progress value={sent} aria-label="Upload progress" />
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {sent < 100 ? `Uploading… ${sent}%` : "Validating and importing rows…"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · ready to import</p>
            )}
          </div>
          <div className="flex gap-2">
            {!uploading ? (
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                <X aria-hidden /> Remove
              </Button>
            ) : null}
            <Button size="sm" onClick={() => onUpload(file)} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <UploadCloud aria-hidden />}
              {uploading ? "Importing…" : "Import file"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
