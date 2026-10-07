import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="size-10" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Sign in to FinPilot</h1>
            <p className="text-sm text-muted-foreground">Portfolio &amp; goal monitoring for the wealth-service team</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-1">
            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <div className="space-y-2 text-center text-xs text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Demo environment.</strong> Demo viewer and admin
            credentials are listed in the project README.
          </p>
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden />
            Your session lives in an HttpOnly cookie, never in page storage.
          </p>
          <p>All data in this environment is synthetic.</p>
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
