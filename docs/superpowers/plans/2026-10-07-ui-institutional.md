# Institutional UI Redesign: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the FinPilot web app to the approved "institutional wealth" direction. The spec is [docs/superpowers/specs/2026-10-07-ui-institutional-design.md](../specs/2026-10-07-ui-institutional-design.md). This is presentation only.

**Architecture:**
- Design tokens in `globals.css` drive most of the change.
- A handful of new shared primitives: `StatStrip`, `AllocationBar`, `InitialsAvatar`, `StatusDot`, `ThemeToggle`, and `initials()` in `lib/utils`.
- Each page is then recomposed to use them.
- No hooks, API modules, routes, URL state or schemas change.

**Tech stack:** Next.js 15.5 App Router, React 19, Tailwind v4 (CSS-first `@theme`), shadcn/ui, Recharts 3, next-themes, Vitest with Testing Library.

**Commands.** Run from `apps/web`. On Windows, use the PowerShell tool.

| Purpose | Command |
|---|---|
| Lint | `pnpm lint` |
| Type check | `pnpm typecheck` |
| Tests | `pnpm test` (vitest run) |
| Production build | `pnpm build` |
| Rebuild the web container (repo root) | `docker compose up -d --build web` |

**Rules for every task:**
1. Do not edit anything under `features/*/api.ts`, `hooks.ts`, `types.ts`, `schema.ts`, `url-state.ts`, `filters.ts`, `lib/api/*`, `middleware.ts` or `lib/safe-redirect.ts`.
2. Keep every visible heading, button label, form label, `aria-*` attribute and `data-status` attribute that exists today, unless the task explicitly says otherwise. Tests and screen readers depend on them.
3. Decorative elements, such as avatars inside links, dots and icons, get `aria-hidden`. A link's accessible name must stay the person or item name only. The test asserts `getByRole("link", { name: "Aarav Bose" })`.
4. Numbers use the `tabular` class. Identifiers (customer, account, transaction and goal IDs, and instrument symbols) use `font-mono text-[12px]` or `text-[13px]`.
5. No uppercase micro-labels. Labels are sentence case.
6. Commit at the end of each task. Write the message to a temp file and run `git commit -F <file>`. End the message with:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
   Write the file as UTF-8 **without** a BOM, using `[IO.File]::WriteAllText($p,$msg,(New-Object System.Text.UTF8Encoding($false)))`.

---

## File map

| File | Change |
|---|---|
| `src/app/layout.tsx` | Inter → Geist and Geist Mono; theme-color |
| `src/app/globals.css` | New light and dark tokens, chart palette, font vars, base tweaks |
| `src/lib/utils.ts` (+ `utils.test.ts`) | Add `initials()` |
| `src/components/ui/card.tsx`, `table.tsx`, `tabs.tsx`, `badge.tsx` | Default styles only (radius, no shadow, sentence-case headers) |
| `src/components/page-header.tsx` | 28px title scale |
| `src/components/stat-strip.tsx` (new, + test) | One surface with N figures separated by hairlines |
| `src/components/status-dot.tsx` (new) | Dot plus text status indicator |
| `src/components/initials-avatar.tsx` (new) | Decorative initials avatar |
| `src/components/charts/allocation-bar.tsx` (new, + test) | Stacked horizontal bar plus legend |
| `src/components/charts/net-flows-chart.tsx` | Palette and axis styling |
| `src/components/charts/allocation-chart.tsx` | Styling only (still used on the customer overview tab) |
| `src/components/app-shell/*` | Light full-height sidebar, rail, top bar with page title, `ThemeToggle` |
| `src/features/overview/components/*` | Hero band, allocation bar, new grid; `headline-cards.tsx` replaced by `hero-band.tsx` |
| `src/features/customers/components/*` | Toolbar, table, KYC dot, header |
| `src/features/portfolio/components/*` | Freshness line, summary strip, positions table |
| `src/features/transactions/components/*`, `src/features/goals/components/*` | Restyle |
| `src/features/imports/components/*`, `src/app/login/page.tsx` | Restyle; login becomes a centred column |

---

### Task 1: Foundations (fonts, tokens, base components)

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/ui/card.tsx`
- Modify: `apps/web/src/components/ui/table.tsx`
- Modify: `apps/web/src/components/page-header.tsx`

- [ ] **Step 1: Fonts.** In `layout.tsx`, replace the Inter import and instance:

```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
```

Set `<html lang="en-IN" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>`.

Set the viewport theme colours to `#f6f5f2` (light) and `#0e1114` (dark).

- [ ] **Step 2: Theme font variables.** In `globals.css` `@theme inline`:

```css
  --font-sans: var(--font-geist), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
```

- [ ] **Step 3: Light tokens.** Replace the whole `:root { … }` block with:

```css
/* Institutional: warm-grey canvas, white surfaces, near-black ink, one deep-emerald accent. */
:root {
  --background: #f6f5f2;
  --foreground: #0c0f14;
  --card: #ffffff;
  --card-foreground: #0c0f14;
  --popover: #ffffff;
  --popover-foreground: #0c0f14;
  /* White on #0f6e56 = 6.1:1. */
  --primary: #0f6e56;
  --primary-foreground: #ffffff;
  --secondary: #efede8;
  --secondary-foreground: #1d2128;
  --muted: #efede8;
  /* #5b616e: 5.8:1 on canvas, 6.4:1 on white, 5.4:1 on muted. */
  --muted-foreground: #5b616e;
  --accent: #e7f2ee;
  --accent-foreground: #0b5442;
  --destructive: #b42318;
  /* Semantic text colours stay >= 4.5:1 on white and on their -muted fills. */
  --positive: #0f7a4a;
  --positive-muted: #e3f3ea;
  --negative: #b42318;
  --negative-muted: #fbe9e7;
  --warning: #95540a;
  --warning-muted: #fbf0dc;
  --info: #2b5a8a;
  --info-muted: #e6eef6;
  --border: #e6e4df;
  --input: #d6d3cc;
  --ring: #0f6e56;
  /* Asset classes, muted and >= 3:1 on white: equity, ETF, MF, bond, REIT, G-Sec. */
  --chart-1: #1f6f5c;
  --chart-2: #3d5a80;
  --chart-3: #b08442;
  --chart-4: #7a6c5d;
  --chart-5: #7b4b6a;
  --chart-6: #5f7f95;
  --radius: 0.625rem;
  --card-shadow: 0 1px 0 rgb(12 15 20 / 0.03);
  --sidebar: #ffffff;
  --sidebar-foreground: #3b414b;
  --sidebar-primary: #0f6e56;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e7f2ee;
  --sidebar-accent-foreground: #0b5442;
  --sidebar-border: #e6e4df;
  --sidebar-ring: #0f6e56;
}
```

- [ ] **Step 4: Dark tokens.** Replace the whole `.dark { … }` block with:

```css
/* Dark: elevation through lighter surfaces (canvas < card < popover), not inversion. */
.dark {
  --background: #0e1114;
  --foreground: #e8eaed;
  --card: #15191e;
  --card-foreground: #e8eaed;
  --popover: #1c2127;
  --popover-foreground: #e8eaed;
  --primary: #3fb68f;
  --primary-foreground: #06140f;
  --secondary: #1c2127;
  --secondary-foreground: #e8eaed;
  --muted: #1c2127;
  --muted-foreground: #9aa1ac;
  --accent: #12302a;
  --accent-foreground: #8fdcc0;
  --destructive: #f0857a;
  --positive: #4cc38a;
  --positive-muted: #10291d;
  --negative: #f0857a;
  --negative-muted: #331614;
  --warning: #e0a64a;
  --warning-muted: #2d2110;
  --info: #7fb0e0;
  --info-muted: #13243a;
  --border: rgb(255 255 255 / 0.08);
  --input: rgb(255 255 255 / 0.14);
  --ring: #3fb68f;
  --chart-1: #4fb393;
  --chart-2: #7d9cc6;
  --chart-3: #d2a964;
  --chart-4: #a8998a;
  --chart-5: #b588a6;
  --chart-6: #8fadc2;
  --card-shadow: none;
  --sidebar: #121519;
  --sidebar-foreground: #b8bec7;
  --sidebar-primary: #3fb68f;
  --sidebar-primary-foreground: #06140f;
  --sidebar-accent: #12302a;
  --sidebar-accent-foreground: #8fdcc0;
  --sidebar-border: rgb(255 255 255 / 0.06);
  --sidebar-ring: #3fb68f;
}
```

- [ ] **Step 5: Base layer.** In `@layer base`, change the `body` rule to the following. This removes the Inter-only `cv11`/`ss01` features.

```css
  body {
    @apply bg-background text-foreground antialiased;
  }
```

- [ ] **Step 6: Card.** In `card.tsx`:
  - In `Card`'s class string, replace `rounded-lg border bg-card … shadow-card` with `rounded-[10px] border bg-card … shadow-card`. The rest of the string is unchanged.
  - Change `CardTitle` to `"font-heading text-base leading-snug font-semibold tracking-[-0.01em] group-data-[size=sm]/card:text-sm"`.
  - Change `CardDescription` to `"text-[13px] text-muted-foreground"`.

- [ ] **Step 7: Table.** In `table.tsx`:
  - `TableHeader`: `cn("[&_tr]:border-b", className)`. The tinted header background is removed.
  - `TableRow`: `"border-b transition-colors hover:bg-muted/60 has-aria-expanded:bg-muted/60 data-[state=selected]:bg-accent"`.
  - `TableHead`: `"h-10 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0"`. This removes `uppercase`, `tracking-wide` and `[&_button]:uppercase`.
  - `TableCell`: `"px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0"`.
  - `TableFooter`: `"border-t bg-muted/40 font-medium [&>tr]:last:border-b-0"`.

- [ ] **Step 8: PageHeader title.** In `page-header.tsx`:
  - Set the `<h1>` class to `text-[28px] leading-tight font-semibold tracking-[-0.02em]`.
  - Set the description class to `text-sm text-muted-foreground`.
  - Set the wrapper gap to `gap-4`.

- [ ] **Step 9: Verify.** Run `pnpm lint; pnpm typecheck; pnpm test`. Expected: all pass (57 tests).

- [ ] **Step 10: Commit.** Message: `style(web): institutional design tokens, Geist type and quieter base components`.

---

### Task 2: Shared primitives (TDD)

**Files:**
- Modify: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/lib/utils.test.ts`
- Create: `apps/web/src/components/initials-avatar.tsx`
- Create: `apps/web/src/components/status-dot.tsx`
- Create: `apps/web/src/components/stat-strip.tsx`
- Create: `apps/web/src/components/stat-strip.test.tsx`
- Create: `apps/web/src/components/charts/allocation-bar.tsx`
- Create: `apps/web/src/components/charts/allocation-bar.test.tsx`

- [ ] **Step 1: Write the failing tests.**

`src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { initials } from "./utils";

describe("initials", () => {
  it("takes the first letter of the first two words, upper-cased", () => {
    expect(initials("rohan kulkarni")).toBe("RK");
    expect(initials("Demo  Admin User")).toBe("DA");
    expect(initials("Aarav")).toBe("A");
    expect(initials("  ")).toBe("");
  });
});
```

`src/components/stat-strip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatStrip } from "./stat-strip";

describe("StatStrip", () => {
  it("renders each figure as a labelled term/definition pair", () => {
    render(
      <StatStrip
        label="Book size"
        items={[
          { label: "Customers", value: "120", hint: "113 with holdings" },
          { label: "Accounts", value: "167", title: "167 accounts" },
        ]}
      />,
    );
    const list = screen.getByRole("region", { name: "Book size" });
    expect(list).toHaveTextContent("Customers");
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("113 with holdings")).toBeInTheDocument();
    expect(screen.getByText("167")).toHaveAttribute("title", "167 accounts");
  });
});
```

`src/components/charts/allocation-bar.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AllocationBar } from "./allocation-bar";

const data = [
  { asset_class: "EQUITY" as const, market_value: 750, weight_pct: 75 },
  { asset_class: "BOND" as const, market_value: 250, weight_pct: 25 },
];

describe("AllocationBar", () => {
  it("summarises the split for assistive tech and lists each class with its weight", () => {
    render(<AllocationBar data={data} />);
    expect(screen.getByRole("img", { name: "Asset allocation: Equity 75.00%, Bond 25.00%" })).toBeInTheDocument();
    const legend = screen.getByRole("list", { name: "Allocation by asset class" });
    const items = within(legend).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Equity");
    expect(items[0]).toHaveTextContent("75.00%");
  });

  it("sizes each segment by its weight", () => {
    const { container } = render(<AllocationBar data={data} />);
    const segments = container.querySelectorAll("[data-segment]");
    expect(segments).toHaveLength(2);
    expect((segments[0] as HTMLElement).style.width).toBe("75%");
  });
});
```

- [ ] **Step 2: Run the tests.** Run `pnpm test -- utils stat-strip allocation-bar`. Expected: FAIL, because the modules and exports do not exist.

> If `formatPercent(75)` does not produce `"75.00%"`, check `src/lib/format.ts` and change the expected strings to whatever `formatPercent` actually returns. Do not change `formatPercent`.

- [ ] **Step 3: Implement.**

Append to `src/lib/utils.ts`:

```ts
/** "Rohan Kulkarni" -> "RK". Used for decorative avatars. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
```

In `components/app-shell/user-menu.tsx`, delete the local `initials` function and import it from `@/lib/utils`.

`src/components/initials-avatar.tsx`:

```tsx
import { cn, initials } from "@/lib/utils";

/** Decorative: the name is always rendered as text next to it, so this is hidden from assistive tech. */
export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
```

`src/components/status-dot.tsx`:

```tsx
import { cn } from "@/lib/utils";

export type StatusTone = "positive" | "warning" | "info" | "negative" | "neutral";

const DOT: Record<StatusTone, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  info: "bg-info",
  negative: "bg-negative",
  neutral: "bg-muted-foreground",
};

/** Status as a coloured dot plus text, so meaning never depends on colour alone. */
export function StatusDot({
  tone,
  children,
  className,
  ...props
}: { tone: StatusTone; children: React.ReactNode; className?: string } & React.ComponentProps<"span">) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap", className)} {...props}>
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} aria-hidden />
      {children}
    </span>
  );
}
```

`src/components/stat-strip.tsx`:

```tsx
import { cn } from "@/lib/utils";

export interface StatStripItem {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Full-precision value as a tooltip when `value` is compact. */
  title?: string;
}

/** Several figures on one surface, separated by hairlines. Wraps to 2 columns on phones. */
export function StatStrip({
  items,
  label,
  className,
  bare = false,
}: {
  items: StatStripItem[];
  label: string;
  className?: string;
  /** `bare` drops the surface, for use inside another card. */
  bare?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className={cn(!bare && "rounded-[10px] border bg-card shadow-card", className)}
    >
      <dl
        className={cn(
          "grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))] sm:[grid-auto-flow:column]",
          "[&>div]:border-border max-sm:[&>div:nth-child(n+3)]:border-t sm:[&>div+div]:border-l max-sm:[&>div:nth-child(even)]:border-l",
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="min-w-0 px-5 py-4">
            <dt className="text-[13px] text-muted-foreground">{item.label}</dt>
            <dd className="tabular mt-1 truncate text-xl leading-tight font-semibold tracking-[-0.01em]" title={item.title}>
              {item.value}
            </dd>
            {item.hint ? <dd className="mt-0.5 truncate text-xs text-muted-foreground">{item.hint}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
```

`src/components/charts/allocation-bar.tsx`:

```tsx
import { formatMoney, formatMoneyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { AllocationDatum } from "./allocation-chart";
import { ASSET_CLASS_COLOR, assetClassLabel } from "./asset-class";

/** One stacked horizontal bar plus a legend grid: a better fit than a donut for 2–6 shares of a whole. */
export function AllocationBar({ data, className }: { data: AllocationDatum[]; className?: string }) {
  const summary = data.map((d) => `${assetClassLabel(d.asset_class)} ${formatPercent(d.weight_pct)}`).join(", ");
  return (
    <div className={cn("space-y-5", className)}>
      <div role="img" aria-label={`Asset allocation: ${summary}`} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {data.map((d) => (
          <span
            key={d.asset_class}
            data-segment
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${d.weight_pct}%`, background: ASSET_CLASS_COLOR[d.asset_class] }}
          />
        ))}
      </div>
      <ul aria-label="Allocation by asset class" className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
        {data.map((d) => (
          <li key={d.asset_class} className="min-w-0">
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: ASSET_CLASS_COLOR[d.asset_class] }} aria-hidden />
              {assetClassLabel(d.asset_class)}
            </span>
            <span className="tabular mt-0.5 block text-base font-semibold">{formatPercent(d.weight_pct)}</span>
            <span className="tabular block text-xs text-muted-foreground" title={formatMoney(d.market_value)}>
              {formatMoneyCompact(d.market_value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests.** Run `pnpm test`. Expected: all pass.

- [ ] **Step 5: Lint and type check.** Run `pnpm lint; pnpm typecheck`. Expected: clean.

- [ ] **Step 6: Commit.** Message: `feat(web): stat strip, allocation bar, status dot and initials avatar primitives`.

---

### Task 3: App shell

**Files:**
- Modify: `apps/web/src/components/app-shell/app-shell.tsx`
- Modify: `apps/web/src/components/app-shell/sidebar-nav.tsx`
- Modify: `apps/web/src/components/app-shell/user-menu.tsx`
- Modify: `apps/web/src/components/app-shell/nav-config.ts`
- Create: `apps/web/src/components/app-shell/theme-toggle.tsx`

- [ ] **Step 1: Nav config.**
  - Give the first section `label: "Workspace"`.
  - Add a helper that the top bar uses for the page title:

```ts
export function currentNavLabel(pathname: string): string | undefined {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) if (item.isActive(pathname)) return item.label;
  }
  return undefined;
}
```

- [ ] **Step 2: ThemeToggle** (`theme-toggle.tsx`):

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/** One-click light/dark switch for the top bar. "System" remains available in the user menu. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" aria-hidden />
      <Moon className="dark:hidden" aria-hidden />
    </Button>
  );
}
```

- [ ] **Step 3: Sidebar.** In `app-shell.tsx`:
  - The `<aside>` becomes `fixed inset-y-0 left-0 z-30 hidden h-dvh w-16 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex xl:w-60`. The old sidebar was already `fixed` and full height in a real browser. The white gap in the "before" screenshots is a Playwright full-page artifact: fixed elements are painted only within the first viewport. Task 9 therefore takes the desktop shots as viewport-height captures in addition to full-page ones.
  - The brand row is `flex h-14 items-center justify-center border-b border-sidebar-border px-3 xl:justify-start xl:px-5`.
  - `Brand` with `tone="sidebar"` uses `text-foreground` (no longer `text-white`) and the `focus-visible:ring-ring/50` ring.
  - The content wrapper becomes `md:pl-16 xl:pl-60`.

- [ ] **Step 4: Sidebar nav.** In `sidebar-nav.tsx`:
  - **Section label:** `px-3 pb-1.5 text-xs font-medium text-muted-foreground` (sentence case, no uppercase). For `rail`, keep it hidden below xl.
  - **Rail item, inactive:** `text-sidebar-foreground hover:bg-muted hover:text-foreground`.
  - **Rail item, active:** `bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-3 before:w-0.5 before:rounded-full before:bg-sidebar-primary`.
  - **Item base:** `h-9 … text-[13px] font-medium`, with `focus-visible:ring-ring/50` for both variants.
  - **Section dividers for rail:** keep the existing logic.
  - Update the doc comment from "navy" to "light".

- [ ] **Step 5: User menu.** In `user-menu.tsx`, for the non-compact trigger:
  - Use `text-sidebar-foreground hover:bg-muted focus-visible:ring-ring/50`.
  - The name span uses `text-foreground` (not `text-white`), and the role span uses `text-muted-foreground`.
  - The chevron uses `text-muted-foreground`.
  - The avatar fallback uses `bg-accent text-accent-foreground`.

- [ ] **Step 6: Top bar.** In `app-shell.tsx`, the header becomes:
  - `sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 lg:px-8`.
  - **Left (md and up):** `<p className="hidden truncate text-sm font-medium md:block">{currentNavLabel(pathname)}</p>`, with `usePathname()` from `next/navigation`. On mobile, keep the menu button plus `Brand`.
  - **Right**, inside `ml-auto flex items-center gap-1.5`:
    - `<GlobalSearchTrigger className="hidden w-60 md:flex" />`
    - the mobile icon trigger, unchanged
    - `<ThemeToggle />`
    - the compact `UserMenu` on mobile, unchanged.

- [ ] **Step 7: Main column.** `main` becomes `mx-auto w-full max-w-[1360px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8`.

- [ ] **Step 8: Search trigger.** In `global-search.tsx`, restyle `GlobalSearchTrigger`'s button: `h-9 rounded-md border bg-card text-[13px] text-muted-foreground hover:bg-muted`. The `⌘K` / `Ctrl K` hint stays as a `kbd` with `font-mono text-[11px]`. Do not change behaviour.

- [ ] **Step 9: Verify.** Run `pnpm lint; pnpm typecheck; pnpm test`. All must pass.

- [ ] **Step 10: Commit.** Message: `style(web): light full-height sidebar, rail and top bar with page title and theme toggle`.

---

### Task 4: Overview page

**Files:**
- Create: `apps/web/src/features/overview/components/hero-band.tsx`
- Delete: `apps/web/src/features/overview/components/headline-cards.tsx`
- Modify: `overview-page.tsx`, `top-customers-card.tsx`, `top-instruments-card.tsx`, `underfunded-goals-card.tsx`, `data-quality-card.tsx`, `net-flows-card.tsx`
- Modify: `apps/web/src/components/charts/net-flows-chart.tsx`
- Test: `apps/web/src/features/overview/components/top-lists.test.tsx` (must still pass unchanged)

- [ ] **Step 1: HeroBand.** Create `hero-band.tsx`:

```tsx
import { StatStrip } from "@/components/stat-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInteger, formatMoney, formatMoneyCompact } from "@/lib/format";

import type { Headline } from "../types";

/** The one number that matters (AUM) at hero size; book-size figures as secondary stats beneath it. */
export function HeroBand({ headline }: { headline: Headline }) {
  return (
    <section aria-label="Headline figures" className="rounded-[10px] border bg-card shadow-card">
      <div className="px-5 pt-5 pb-4 sm:px-6">
        <p className="text-[13px] text-muted-foreground">Assets under management</p>
        <p className="tabular mt-1 text-[40px] leading-none font-semibold tracking-[-0.02em]" title={formatMoney(headline.aum)}>
          {formatMoneyCompact(headline.aum)}
        </p>
        <p className="tabular mt-2 text-[13px] text-muted-foreground">{formatMoney(headline.aum)}</p>
      </div>
      <div className="border-t">
        <StatStrip
          bare
          label="Book size"
          items={[
            { label: "Customers", value: formatInteger(headline.customers), hint: `${formatInteger(headline.customers_with_holdings)} with holdings` },
            { label: "Accounts", value: formatInteger(headline.accounts), hint: `${formatInteger(headline.active_accounts)} active` },
            { label: "Transactions", value: formatInteger(headline.transactions), hint: "All time, all statuses" },
            { label: "Goals", value: formatInteger(headline.goals), hint: "Across all customers" },
          ]}
        />
      </div>
    </section>
  );
}

export function HeroBandSkeleton() {
  return (
    <div className="space-y-3 rounded-[10px] border bg-card p-6" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}
```

Delete `headline-cards.tsx`. Its "Data as of" tile moves into the page header description, which already reads "Firm-wide book as of {date}". When `headline.price_as_of` differs from `snapshot_date`, append ` · prices as of {date}` to that description in `overview-page.tsx`.

- [ ] **Step 2: Page composition.** In `overview-page.tsx`, inside the success branch, use this layout. Every grid uses `items-stretch`, and every card inside gets `h-full`.

```tsx
<HeroBand headline={data.headline} />

<Card>
  <CardHeader>
    <CardTitle>Asset allocation</CardTitle>
    <CardDescription>All customer holdings by asset class, at current prices</CardDescription>
  </CardHeader>
  <CardContent>
    {data.allocation.length === 0 ? (
      <p className="py-10 text-center text-sm text-muted-foreground">No holdings in the current snapshot.</p>
    ) : (
      <AllocationBar data={data.allocation} />
    )}
  </CardContent>
</Card>

<div className="grid items-stretch gap-6 lg:grid-cols-12">
  <div className="lg:col-span-8"><NetFlowsCard flows={data.monthly_net_flows} /></div>
  <div className="lg:col-span-4"><TopCustomersCard customers={data.top_customers} /></div>
</div>

<div className="grid items-stretch gap-6 lg:grid-cols-12">
  <div className="lg:col-span-8"><UnderfundedGoalsCard goals={data.high_priority_underfunded_goals} /></div>
  <div className="lg:col-span-4"><DataQualityCard exceptions={data.data_quality} /></div>
</div>

<TopInstrumentsCard instruments={data.top_instruments_by_holders} />
```

- Replace `HeadlineCardsSkeleton` with `HeroBandSkeleton`.
- The skeleton's donut placeholder becomes `<Skeleton className="h-3 w-full rounded-full" />` followed by a 6-column row of `h-12` skeletons.
- Each child card (`NetFlowsCard`, `TopCustomersCard`, `UnderfundedGoalsCard`, `DataQualityCard`) gets `className="h-full"` on its root `<Card>`.

- [ ] **Step 3: Top customers.** In `top-customers-card.tsx`, keep `MAX_ROWS = 5`, the `<ol>`, the links and the "View all" action. Each row becomes:

```tsx
<span className="tabular w-4 text-xs text-muted-foreground">{index + 1}</span>
<InitialsAvatar name={c.full_name} />
<span className="min-w-0 flex-1">
  <span className="block truncate text-sm font-medium">{c.full_name}</span>
  <span className="block font-mono text-[12px] text-muted-foreground">{c.customer_id}</span>
</span>
<span className="tabular text-right text-sm font-semibold" title={formatMoney(c.aum)}>{formatMoneyCompact(c.aum)}</span>
```

- Remove the segment `Badge` from this card. The avatar replaces it; segment is shown on the customer pages.
- Row padding is `py-2.5`.
- The test still finds `listitem` × 5.

- [ ] **Step 4: Top instruments (full width).** In `top-instruments-card.tsx`, keep `MAX_ROWS = 5` and the `<Table>` with one header row.
- Columns: Instrument (mono symbol over a muted name), Class (always visible, dot plus label), Holders.
- Holders shows a right-aligned number followed by a 120px bar. The bar width is `holders / max(holders) * 100%`, coloured `bg-primary/70`, `h-1.5 rounded-full`, inside a `bg-muted` track, and `hidden sm:block`.
- Remove the responsive `hidden … lg:hidden xl:table-cell` juggling now that the card is full width.

- [ ] **Step 5: Goals at risk.** In `underfunded-goals-card.tsx`, keep the title text "High-priority goals under 25% funded" and the description.
- Replace the two-column grid with a single list (`divide-y`). Each row is a 4-column grid at `sm` (`grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]`):
  1. Customer name (font-medium) with "· goal type" muted.
  2. A progress bar (`h-1.5 rounded-full bg-muted`, with fill `bg-warning`) above "₹x of ₹y" (12px muted).
  3. Right-aligned funded % (tabular, `text-warning`, font-medium) above "Due {date}" (12px muted).
- Keep the existing data fields and formatters; only the markup changes. Show at most 8 rows. The API already limits the list.

- [ ] **Step 6: Data quality.** In `data-quality-card.tsx`:
  - Keep the headings "Rejected at import" and "Reconciliation flags" and the "Review import history" link.
  - Rows become `flex items-center justify-between py-2 text-[13px]`, with the label over the entity in 12px muted, and the count as a tabular number in `font-medium`. Remove the pill-in-a-boxed-list styling.
  - Sub-groups are separated by `border-t pt-3`.

- [ ] **Step 7: Net flows chart.** In `net-flows-chart.tsx`:
  - The positive bar fill is `var(--primary)` with `fillOpacity={0.85}`; negative stays `var(--negative)`.
  - The grid stroke is `var(--border)` with `strokeDasharray="3 3"`.
  - Ticks use `fontSize: 12`.
  - `maxBarSize={28}`.
  - Bar `radius={[3, 3, 0, 0]}`.

  In `net-flows-card.tsx`, the root `Card` gets `className="h-full"` and the chart area grows with `flex-1`.

- [ ] **Step 8: Verify.** Run `pnpm lint; pnpm typecheck; pnpm test`. All must pass, including `top-lists.test.tsx` unchanged.

- [ ] **Step 9: Commit.** Message: `feat(web): overview hero band, allocation bar and balanced 12-column grid`.

---

### Task 5: Customers list

**Files:**
- Modify: `apps/web/src/features/customers/components/customers-page.tsx`
- Modify: `customers-filters.tsx`
- Modify: `customers-table.tsx`
- Modify: `customer-badges.tsx`
- Modify: `apps/web/src/components/pagination-bar.tsx` (style only)
- Test: `customers-page.test.tsx` (must pass unchanged)

- [ ] **Step 1: Badges become dots.** In `customer-badges.tsx`, `KycBadge` renders `StatusDot` with the same label text:

```tsx
const KYC: Record<KycStatus, { label: string; tone: StatusTone }> = {
  VERIFIED: { label: "KYC verified", tone: "positive" },
  PENDING: { label: "KYC pending", tone: "warning" },
  REVIEW: { label: "KYC in review", tone: "info" },
};

export function KycBadge({ status, className }: { status: KycStatus; className?: string }) {
  const meta = KYC[status];
  return <StatusDot tone={meta.tone} className={className}>{meta.label}</StatusDot>;
}
```

`SegmentBadge` keeps its `Badge` and its sr-only " segment" text, with new styles:

```tsx
const SEGMENT_STYLE: Record<Segment, string> = {
  Mass: "border-border bg-transparent text-muted-foreground",
  Affluent: "border-border bg-muted text-foreground",
  HNI: "border-transparent bg-accent text-accent-foreground",
};
```

The `Badge` gets `className={cn("rounded-md px-1.5 text-xs font-medium", SEGMENT_STYLE[segment], className)}`.

- [ ] **Step 2: Toolbar.** In `customers-filters.tsx`, remove the surrounding Card or box. The toolbar row is `flex flex-col gap-3 sm:flex-row sm:items-end`, with the search field `sm:flex-1` and the selects at fixed widths (`sm:w-44`). Keep every `Label` text ("Search", "KYC status", "Segment", "Sort by").

- [ ] **Step 3: Table surface.** In `customers-page.tsx`:
  - Render the toolbar above, and below it one surface `rounded-[10px] border bg-card shadow-card overflow-hidden` holding the table and the pagination footer (`border-t px-4 py-3`).
  - Keep the result-count text exactly ("… matching customers" or "… customers in the book"). The test regex `/2 matching customers/` depends on it.

- [ ] **Step 4: Rows.** In `customers-table.tsx`:
  - **Customer cell:** `<div className="flex items-center gap-3"><InitialsAvatar name={c.full_name} /> <div className="min-w-0"> <Link …>{c.full_name}</Link> (14/500) <span className="block truncate text-xs text-muted-foreground">{c.email}</span></div></div>`. The `Link` text must be the name only.
  - **ID cell:** `font-mono text-[13px] text-muted-foreground`.
  - **KYC:** `<KycBadge>`, now a dot.
  - **Segment:** `<SegmentBadge>`.
  - **Accounts and AUM:** right-aligned and `tabular`. AUM is `font-medium`. "No holdings" is `text-muted-foreground`.
  - **Header:** keep the sort buttons and `aria-sort`. The header row is `sticky top-14 z-10 bg-card` on desktop (`md:` prefix).
  - **Header text:** sentence case. Header labels may already be in sentence case in the source, with the uppercase coming from CSS; if so, nothing changes.

- [ ] **Step 5: Pagination bar.** In `pagination-bar.tsx`, buttons use `variant="ghost"` and `size="sm"`, and the "Showing x–y of z" text is `text-[13px] text-muted-foreground`. Keep all labels.

- [ ] **Step 6: Verify.** Run `pnpm lint; pnpm typecheck; pnpm test`. All pass.

- [ ] **Step 7: Commit.** Message: `style(web): customers toolbar, single table surface, dot-and-text KYC`.

---

### Task 6: Customer header, tabs and overview tab

**Files:**
- Modify: `apps/web/src/features/customers/components/customer-header.tsx`
- Modify: `customer-tabs.tsx`
- Modify: `customer-layout.tsx`
- Modify: `customer-overview-tab.tsx`
- Modify: `customer-cards.tsx`
- Modify: `risk-profile-card.tsx`
- Modify: `apps/web/src/components/ui/tabs.tsx` (only if the line variant is defined there)

- [ ] **Step 1: Header.** In `customer-header.tsx`, use a single surface (`rounded-[10px] border bg-card p-5 sm:p-6`) with `flex flex-col gap-4 md:flex-row md:items-start md:justify-between`.
  - **Left block:**
    - `<h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">{name}</h1>`
    - A meta row `mt-2 flex flex-wrap items-center gap-x-3 gap-y-1`: mono ID (`font-mono text-[13px] text-muted-foreground`), `KycBadge`, `SegmentBadge`.
    - A contact row `mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground` with the existing icons (`size-3.5`, `aria-hidden`).
  - **Right block:** "Customer since {date}" as `text-[13px] text-muted-foreground md:text-right`.
  - Keep the breadcrumb above the header as it is today.

- [ ] **Step 2: Tabs.** In `customer-tabs.tsx`, tabs are links styled as an underline bar:
  - Container: `flex gap-6 border-b`.
  - Each tab: `relative -mb-px flex h-10 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-foreground`.
  - Active tab (when `aria-current="page"`): `border-primary text-foreground`.
  - Keep the icons at `size-4`, `aria-hidden`. Keep the labels and `aria-current`.

- [ ] **Step 3: Overview tab.** In `customer-overview-tab.tsx`, `customer-cards.tsx` and `risk-profile-card.tsx`:
  - Replace any `StatCard` grid with `<StatStrip label="Customer summary" items={…}>`, using the same labels, values and hints.
  - Cards keep their titles. Remove icon chips (`bg-accent` squares) next to titles.
  - Definition lists use `text-[13px]`, with labels in `text-muted-foreground`.
  - The `AllocationChart` stays.

- [ ] **Step 4: AllocationChart polish.** In `components/charts/allocation-chart.tsx`:
  - `innerRadius={70}`, `outerRadius={96}`, `paddingAngle={data.length > 1 ? 1 : 0}`.
  - The centre label "Total" is `text-xs`.
  - The legend swatch is `size-2 rounded-full`.
  - No other change.

- [ ] **Step 5: Verify.** Run `pnpm lint; pnpm typecheck; pnpm test`.

- [ ] **Step 6: Commit.** Message: `style(web): customer header surface, underline tabs and summary strip`.

---

### Task 7: Portfolio tab

**Files:**
- Modify: `apps/web/src/features/portfolio/components/freshness-banner.tsx`
- Modify: `portfolio-summary.tsx`
- Modify: `positions-table.tsx`
- Modify: `account-cards.tsx`
- Modify: `portfolio-tab.tsx`
- Modify: `apps/web/src/components/pnl.tsx` (style only)

- [ ] **Step 1: Freshness line.** The banner becomes an inline muted row: `flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground`, with a `CalendarClock` icon at `size-3.5`. It has no border or background. Keep the text content.

- [ ] **Step 2: Summary strip.** `portfolio-summary.tsx` renders `<StatStrip label="Portfolio summary" items={[…]}>` with the four existing figures:
  - Market value (compact, `title` full, `hint` full);
  - Invested;
  - Unrealised P/L (value is the existing `<Pnl>` element, hint is the existing % line);
  - Accounts (`"N active · M positions"`).

  Remove the icons.

- [ ] **Step 3: Pnl.** In `pnl.tsx`, keep the semantics (sign, arrow, colour). The arrow icon becomes `size-3.5`, and the colour applies to the figure only, with no background.

- [ ] **Step 4: Positions table.** In `positions-table.tsx`:
  - Wrap the table in a Card whose header holds the title "Positions", the count description, and the existing Account and Asset class selects. The selects sit in `CardAction`, laid out as `flex gap-2`, with each select `w-40`. Keep the labels; visually hide them with `sr-only` only if they are currently visible and the layout needs it. They are visible today, so keep them as small 12px labels.
  - **Instrument cell:** asset-class dot (`size-2 rounded-full`) + `font-mono text-[13px] font-medium` symbol + class label muted, over a name · sector line (12px muted).
  - **Account cell:** `font-mono text-[12px] text-muted-foreground`.
  - **Numeric cells:** right-aligned and `tabular`.
  - **Unrealised P/L cell:** `<Pnl>` over the % in 12px.
  - **Weight cell:** `flex items-center justify-end gap-2`, with the % followed by `<span className="hidden h-1.5 w-12 rounded-full bg-muted sm:block"><span className="block h-full rounded-full bg-primary/70" style={{ width: \`${Math.min(weight, 100)}%\` }} /></span>`.
  - Keep the sort buttons and `aria-sort`.

- [ ] **Step 5: Account cards.** In `account-cards.tsx`, cards use the default Card. The account ID is in mono, the status uses `StatusDot` (ACTIVE → positive, otherwise neutral), and figures are tabular.

- [ ] **Step 6: Verify.** Run `pnpm lint; pnpm typecheck; pnpm test`.

- [ ] **Step 7: Commit.** Message: `style(web): portfolio freshness line, summary strip and denser positions table`.

---

### Task 8: Transactions, goals and import

**Files:**
- Modify: `apps/web/src/features/transactions/components/transactions-filters.tsx`
- Modify: `transactions-table.tsx`
- Modify: `transaction-badges.tsx`
- Modify: `recent-transactions-card.tsx`
- Modify: `apps/web/src/features/goals/components/goal-card.tsx`
- Modify: `goal-flag-badges.tsx`
- Modify: `goal-summary-card.tsx`
- Modify: `goals-tab.tsx`
- Modify: `apps/web/src/features/imports/components/import-page.tsx`
- Modify: `import-summary.tsx`
- Modify: `import-history.tsx`
- Modify: `import-errors-table.tsx`
- Modify: `import-status-badge.tsx`
- Modify: `upload-dropzone.tsx`
- Tests: `transaction-badges.test.tsx`, `goal-form-dialog.test.tsx` (must pass)

- [ ] **Step 1: Transaction status.** In `transaction-badges.tsx`, `TransactionStatusBadge` keeps its outer element with `data-status`, its `title`, its label text and an `svg[aria-hidden='true']` icon (the test checks for the svg). Restyle it to `inline-flex items-center gap-1.5 text-[13px]`, with the icon at `size-3.5` in the tone colour (SETTLED → positive, PENDING → warning, REVERSED → muted). Remove the pill background. `transactionRowClass` is unchanged. Its test asserts `line-through` and `bg-warning-muted`.

- [ ] **Step 2: Transactions table and filters.**
  - Filters use the same toolbar pattern as Task 5, step 2.
  - The table sits in one surface with the pagination footer.
  - The transaction ID and instrument symbol are mono.
  - The type (BUY/SELL/…) is plain 13px text, with SELL in `text-foreground` and others muted. No coloured pills.
  - Amounts are right-aligned and `tabular`.
  - Keep all labels and URL behaviour.

- [ ] **Step 3: Recent transactions card** (customer overview tab). Rows are `flex justify-between py-2.5 text-[13px]`, with date and type on the left and the amount right-aligned and tabular.

- [ ] **Step 4: Goals.**
  - **`goal-card.tsx`:** default Card. The title row has the goal name (font-semibold) and a priority `StatusDot` (HIGH → negative, MEDIUM → warning, LOW → neutral, keeping the existing label text). Funded % is 20px tabular. The progress bar is `h-1.5`, coloured `bg-primary`, or `bg-warning` when under 25%. Meta (target, due date) is 12px muted.
  - **`goal-flag-badges.tsx`:** `StatusDot` with tone warning, same texts.
  - **`goal-summary-card.tsx`:** `StatStrip` with the same figures.
  - **`goals-tab.tsx`:** the "Add goal" button stays `variant="default"` and is placed in the section header row.
  - Do not touch `goal-form-dialog.tsx` logic. The dialog inherits the new tokens automatically.

- [ ] **Step 5: Import.** Single column, as today.
  - **`upload-dropzone.tsx`:** `rounded-[10px] border border-dashed bg-card` with the upload icon in a `size-10 rounded-full bg-muted` circle. Keep the labels and the input.
  - **`import-summary.tsx`:** counts via `<StatStrip label="Import result" items={[…]}>`. Keep the same labels (inserted, duplicates, rejected and so on).
  - **`import-status-badge.tsx`:** `StatusDot` (COMPLETED → positive, FAILED → negative, otherwise warning), same texts.
  - **`import-errors-table.tsx`, `import-history.tsx`:** the table pattern, with mono batch, row and transaction IDs.

- [ ] **Step 6: Verify.** Run `pnpm lint; pnpm typecheck; pnpm test`.

- [ ] **Step 7: Commit.** Message: `style(web): transactions, goals and import adopt the institutional system`.

---

### Task 9: Login, polish and verification

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/components/states/empty-state.tsx`
- Modify: `apps/web/src/components/states/error-state.tsx`
- Modify: `apps/web/src/app/not-found.tsx` (style only)

- [ ] **Step 1: Login.** Replace the two-column layout with a centred column:

```tsx
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
      <p><strong className="font-medium text-foreground">Demo environment.</strong> Demo viewer and admin credentials are listed in the project README.</p>
      <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden />Your session lives in an HttpOnly cookie, never in page storage.</p>
      <p>All data in this environment is synthetic.</p>
    </div>
  </div>
</main>
```

- Remove the unused imports (`CheckCircle2`, `Info`, `CardHeader`, `CardTitle`, `CardDescription`).
- The "Sign in" submit button inside `LoginForm` stays. Check that `login-form.tsx` labels are "Email" and "Password". The screenshot script uses `getByLabel("Email")`, which matches "Work email". Do not rename them.

- [ ] **Step 2: Empty and error states.** Icon circle `size-10 rounded-full bg-muted text-muted-foreground`, title `text-base font-semibold`, body `text-sm text-muted-foreground`. Keep all text, buttons and the request-id display.

- [ ] **Step 3: Full suite.** Run `pnpm lint; pnpm typecheck; pnpm test; pnpm build`. All must pass.

- [ ] **Step 4: Rebuild and screenshots.**
  - From the repo root, run `docker compose up -d --build web`.
  - Then run `node %TEMP%\finpilot-shots\shoot.mjs http://localhost:3000 %TEMP%\finpilot-shots\after`.
  - Inspect overview, customers, the customer portfolio page and login at 1440 light and dark, and at 375 light. Fix any overflow, clipping or contrast issue before continuing.

- [ ] **Step 5: E2E.** Run `$env:E2E_WEB="http://localhost:3000"; python <scratchpad>\e2e.py`. Expected: 30/30 pass.

- [ ] **Step 6: Commit.** Message: `style(web): centred sign-in and calmer empty/error states`.

---

## Self-review

| Spec section | Covered by |
|---|---|
| §1 Foundations (type, tokens, dark, surfaces) | Task 1; `StatStrip` in Task 2 |
| §2 Shell (full-height sidebar, rail, top bar, max width) | Task 3. The "Data as of" chip is **dropped**: the shell has no data, and fetching overview data on every page for one chip is not worth a request. The date stays in the overview page description and the portfolio freshness line. This deviation is noted for the user. |
| §3 Overview | Task 4, rows matching the spec |
| §4 Customers | Task 5 |
| §5 Customer detail | Tasks 6, 7, 8 |
| §6 Import, login | Tasks 8, 9 |
| §7 Verification | Task 9 |

- **Type consistency:** `StatStrip` props (`items`, `label`, `bare`), `StatusDot` (`tone`) and `AllocationBar` (`data`) are used the same way in every task.
- **Placeholders:** none.
