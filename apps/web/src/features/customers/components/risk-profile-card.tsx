import { ShieldQuestion } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, humanizeEnum } from "@/lib/format";

import type { RiskProfile } from "../types";

export function RiskProfileCard({ profile }: { profile: RiskProfile | null }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Risk profile</CardTitle>
        <CardDescription>
          {profile ? `Assessed ${formatDate(profile.assessed_at)}` : "Suitability assessment"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {profile ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold">{profile.risk_level}</span>
                <span className="tabular text-[13px] text-muted-foreground">
                  Score <span className="font-medium text-foreground">{profile.risk_score}</span> / 100
                </span>
              </div>
              <Progress value={profile.risk_score} aria-label={`Risk score ${profile.risk_score} out of 100`} />
              <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden>
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>
            </div>
            <dl className="divide-y text-[13px]">
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Horizon</dt>
                <dd className="tabular text-foreground">
                  {profile.horizon_years} {profile.horizon_years === 1 ? "year" : "years"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Liquidity need</dt>
                <dd className="text-foreground">{humanizeEnum(profile.liquidity_need)}</dd>
              </div>
            </dl>
          </div>
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
