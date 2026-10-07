import { FileCheck2, LineChart, ShieldCheck, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

const CAPABILITIES = [
  { icon: LineChart, title: "Portfolio valued in PostgreSQL", body: "Positions, allocation and gain/loss computed server-side." },
  { icon: FileCheck2, title: "Validated, idempotent imports", body: "Every rejected CSV row comes back with a reason." },
  { icon: UsersRound, title: "Role-based access", body: "Viewers read; administrators also load data." },
] as const;

export default function LoginPage() {
  return (
    // Desktop: exactly one viewport tall, never scrolls; the brand panel sheds its preview
    // and capability list on short screens instead (see the max-height variants below).
    <main className="grid min-h-dvh bg-background lg:h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:overflow-hidden">
      <BrandPanel />

      <div className="flex flex-col px-4 py-8 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:py-6">
        <div className="flex items-center gap-2.5 lg:hidden">
          <Logo className="size-8" />
          <span className="text-base font-semibold tracking-tight">FinPilot</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10 lg:py-4">
          <div className="w-full max-w-[400px] space-y-8">
            <div className="space-y-2">
              <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to your FinPilot workspace.</p>
            </div>

            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm />
            </Suspense>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
              Your session lives in an HttpOnly cookie, never in page storage.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          Demo environment · all data is synthetic.
        </p>
      </div>
    </main>
  );
}

/** Desktop-only brand side: headline, what the product does, and an illustrative (data-free) preview. */
function BrandPanel() {
  return (
    <section
      aria-label="About FinPilot"
      className="relative hidden overflow-hidden bg-[#0b2a22] text-white lg:flex lg:flex-col lg:justify-between lg:gap-8 lg:p-10 xl:px-14"
    >
      {/* Soft glow + hairline grid; purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_10%,rgb(63_182_143/0.28),transparent),radial-gradient(50%_40%_at_0%_100%,rgb(63_182_143/0.14),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <div className="relative flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold tracking-tight">FinPilot</span>
      </div>

      <div className="relative max-w-[520px] space-y-8">
        <div className="space-y-4">
          <p className="text-xs font-medium tracking-[0.14em] text-[#8fdcc0] uppercase">Wealth operations</p>
          <p className="text-[34px] leading-[1.1] font-semibold tracking-[-0.025em] text-balance xl:text-[38px]">
            Every customer&apos;s portfolio, goals and activity in one view.
          </p>
          <p className="max-w-[440px] text-[15px] leading-relaxed text-white/70">
            Consolidated holdings, server-side valuation and safe daily data loads for the wealth-service team.
          </p>
        </div>

        <PreviewCard />

        <ul className="grid gap-5 sm:grid-cols-3 [@media(max-height:620px)]:hidden">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="space-y-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Icon className="size-4 text-[#8fdcc0]" aria-hidden />
              </span>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs leading-relaxed text-white/60">{body}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/50">Synthetic assessment data only. No real customer or market data.</p>
    </section>
  );
}

/** A stylised dashboard fragment. It carries no figures, so it can never contradict the real data. */
function PreviewCard() {
  const segments = [
    { width: "62%", color: "#4fb393" },
    { width: "14%", color: "#7d9cc6" },
    { width: "10%", color: "#d2a964" },
    { width: "8%", color: "#a8998a" },
    { width: "6%", color: "#b588a6" },
  ];
  const bars = [46, 62, 38, 80, 40, 58, 78, 50, 64, 56, 70, 52];
  return (
    <div aria-hidden className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/12 backdrop-blur-sm [@media(max-height:820px)]:hidden">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-2 w-28 rounded-full bg-white/25" />
          <div className="h-5 w-40 rounded-md bg-white/80" />
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/60">Illustrative</span>
      </div>
      <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <span key={s.color} className="h-full" style={{ width: s.width, background: s.color }} />
        ))}
      </div>
      <div className="mt-5 flex h-16 items-end gap-1.5">
        {bars.map((h, i) => (
          <span key={i} className="flex-1 rounded-t-[3px] bg-[#4fb393]/70" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
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
