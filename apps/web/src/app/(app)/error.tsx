"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Boundary inside the app shell so navigation stays usable after a render error (API errors are handled per section). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-4 text-center" role="alert">
      <span className="flex size-12 items-center justify-center rounded-full bg-negative-muted text-negative">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error stopped this page from rendering. You can try again, or return to the overview.
        </p>
        {error.digest ? <p className="font-mono text-[11px] text-muted-foreground">Error ID: {error.digest}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCw aria-hidden /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to overview</Link>
        </Button>
      </div>
    </main>
  );
}
