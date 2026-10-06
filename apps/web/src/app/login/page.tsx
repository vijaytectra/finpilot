import { CheckCircle2, Info, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <section
        aria-label="About FinPilot"
        className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex lg:p-14"
      >
        <div className="flex items-center gap-2.5 text-white">
          <Logo className="size-9" />
          <span className="text-lg font-semibold tracking-tight">FinPilot</span>
        </div>
        <div className="max-w-md space-y-5">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white">
            Investment portfolio &amp; goal monitoring
          </h2>
          <p className="text-sm leading-relaxed">
            One consolidated view of each customer&apos;s accounts, holdings, risk profile, goals and transactions for
            the wealth-service team.
          </p>
          <ul className="space-y-2.5 text-sm">
            {[
              "Server-side portfolio valuation and allocation",
              "Validated CSV imports with a full audit trail",
              "Role-based access for viewers and administrators",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sidebar-ring" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/70">All data in this environment is synthetic.</p>
      </section>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
            <Logo className="size-10 md:hidden" />
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="md:hidden">FinPilot</span>
              <span className="hidden md:inline">Welcome back</span>
            </h1>
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
            <p className="flex items-center justify-center gap-1.5 md:justify-start">
              <ShieldCheck className="size-3.5" aria-hidden />
              Your session lives in an HttpOnly cookie, never in page storage.
            </p>
          </div>
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
