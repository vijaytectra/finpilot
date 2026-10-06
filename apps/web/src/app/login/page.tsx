import { Info, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]"
      />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="size-10" />
          <h1 className="text-xl font-semibold tracking-tight">FinPilot</h1>
          <p className="text-sm text-muted-foreground">Portfolio &amp; goal monitoring for the wealth-service team</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Use your FinPilot work account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <div className="space-y-3 text-xs text-muted-foreground">
          <p className="flex items-start gap-2 rounded-md border border-dashed bg-card/60 p-3">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              <strong className="font-medium text-foreground">Demo environment.</strong> Demo viewer and admin
              credentials are listed in the project README.
            </span>
          </p>
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden />
            Session is kept in a secure, HttpOnly cookie.
          </p>
        </div>
      </div>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
