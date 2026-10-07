"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Last-resort boundary for unexpected render errors (API errors are handled per section). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-4 text-center" role="alert">
      <span className="flex size-10 items-center justify-center rounded-full bg-negative-muted text-negative">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-base font-semibold">Something went wrong</h1>
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
