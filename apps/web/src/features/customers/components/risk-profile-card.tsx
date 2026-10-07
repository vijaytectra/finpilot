import { ShieldQuestion } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { RiskProfile } from "../types";

const SCALE_STEPS = 5;

/** Index (0-4) of the highest segment lit for a 0-100 score. */
const activeStep = (score: number) =>
  Math.min(SCALE_STEPS - 1, Math.max(0, Math.ceil(score / (100 / SCALE_STEPS)) - 1));

export function RiskProfileCard({ profile }: { profile: RiskProfile | null }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Risk profile</CardTitle>
        <CardDescription>Suitability assessment</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {profile ? (
          <>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[28px] leading-none font-semibold tracking-[-0.02em]">{profile.risk_level}</span>
                <span className="tabular text-[13px] text-muted-foreground">
                  Score <span className="font-medium text-foreground">{profile.risk_score}</span> / 100
                </span>
              </div>
              <div className="space-y-2">
                <div
                  role="img"
                  aria-label={`Risk score ${profile.risk_score} out of 100`}
                  className="grid grid-cols-5 gap-1"
                >
                  {Array.from({ length: SCALE_STEPS }, (_, i) => (
                    <span
                      key={i}
                      className={cn("h-2 rounded-full", i <= activeStep(profile.risk_score) ? "bg-primary" : "bg-muted")}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden>
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>
            </div>
            <dl className="mt-auto divide-y border-t text-[13px]">
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Horizon</dt>
                <dd className="tabular text-foreground">
                  {profile.horizon_years} {profile.horizon_years === 1 ? "year" : "years"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Liquidity need</dt>
                <dd className="text-foreground">{humanizeEnum(profile.liquidity_need)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Assessed</dt>
                <dd className="tabular text-foreground">{formatDate(profile.assessed_at)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <ShieldQuestion className="size-5" aria-hidden />
            No risk assessment on file for this customer.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RiskProfileCardSkeleton() {
  return (
    <Card aria-hidden>
      <CardHeader>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </CardContent>
    </Card>
  );
}
