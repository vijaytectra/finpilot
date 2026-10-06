import { Compass } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo className="size-9" />
      <div className="space-y-2">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
          <Compass className="size-4" aria-hidden /> 404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The link may be broken or the page may have moved. Check the address or head back to the overview.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">Go to overview</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/customers">Browse customers</Link>
        </Button>
      </div>
    </main>
  );
}
