# UI redesign: institutional wealth direction

**Date:** 2026-10-07
**Status:** Approved (design), awaiting spec review
**Supersedes (visually):** `2026-10-06-ui-revamp-design.md`. The layout breakpoints from that spec still apply. Its colours, card treatment and overview composition are replaced.

## Why

The 2026-10-06 revamp re-skinned shadcn defaults. These problems show in the screenshots:

- The navy sidebar stops at the viewport height on long pages, and white shows below it.
- There is no hierarchy: six equal KPI tiles give "Goals: 177" the same weight as AUM.
- Every section is an identical bordered card, and the grid leaves holes.
- Chart colours are saturated stock defaults, and the donut repeats its own table.
- Typography is a single weight, with uppercase micro-labels and mixed-width numbers.

The goal is an interface that reads as bank-grade software (reference class: Addepar, Stripe Dashboard, Linear).

## Constraints

- **Presentation layer only.** No changes to API calls, hooks, routes, URL state, validation or business logic.
- **No invented data.** Only figures the API already returns. For example, there is no "AUM change" figure because AUM history is not stored.
- **Accessible names stay the same.** Visible headings, button labels, form labels and table semantics that the Vitest suite and the 30-check E2E rely on are kept. If a test asserts on markup that is intentionally removed (such as the donut's table), the test is updated to the new markup and still asserts the same fact.
- **WCAG 2.1 AA contrast** in both themes. Visible focus ring. Touch targets of at least 40px on mobile.
- **Breakpoints:** 375 / 768 / 1024 / 1440 must all render without horizontal page scroll.

## 1. Foundations (`globals.css`, `layout.tsx`)

### Type

- **Fonts:**
  - Geist (via `next/font/google`) for interface text.
  - Geist Mono for identifiers (customer, account, transaction and goal IDs, plus instrument symbols).
  - Inter is removed.
- **Numbers:** `font-variant-numeric: tabular-nums` on all numeric cells and figures, via the existing `tabular` utility.
- **Scale (px), weight → use:**

  | Size | Weight | Use |
  |---|---|---|
  | 12 | 500 | meta |
  | 13 | 400/500 | table body, secondary |
  | 14 | 400/500 | body |
  | 16 | 600 | section title |
  | 20 | 600 | sub-figure |
  | 28 | 600 | page title |
  | 40 | 600 | hero figure |

  Letter-spacing is −0.02em at 28 and above.
- **Labels** are sentence case at 12–13px muted. No uppercase tracking labels, except table headers at 12px/500 muted in sentence case.

### Colour tokens (light)

| Token | Value | Use |
|---|---|---|
| background | #f6f5f2 | canvas |
| card / popover | #ffffff | surfaces |
| foreground | #0c0f14 | ink |
| muted-foreground | #5b616e | secondary text (≥ 5.9:1 on canvas) |
| border | #e6e4df | hairlines |
| input | #d6d3cc | field borders |
| primary | #0f6e56 | accent: links, selected nav, primary button (white on it ≥ 6:1) |
| accent | #e7f2ee | selected and hover tint |
| accent-foreground | #0b5442 | text on accent |
| ring | #0f6e56 | focus |
| positive | #0f7a4a | gains |
| negative | #b42318 | losses |
| warning | #a15c07 | |
| info | #2b5a8a | |

Each semantic colour gets a `-muted` fill that keeps its text at ≥ 4.5:1.

### Asset-class palette (charts, legends, dots)

Muted and distinguishable, with ≥ 3:1 against white:

| Class | Colour |
|---|---|
| Equity | #1f6f5c (emerald) |
| ETF | #3d5a80 (slate blue) |
| Mutual fund | #b08442 (sand) |
| Bond | #7a6c5d (taupe) |
| REIT | #7b4b6a (plum) |
| G-Sec | #5f7f95 (steel) |

The dark theme uses lighter tints of the same hues.

### Dark theme (elevation, not inversion)

| Token | Value |
|---|---|
| background | #0e1114 |
| card | #15191e |
| popover / raised | #1c2127 |
| border | rgb(255 255 255 / 8%) |
| foreground | #e8eaed |
| muted-foreground | #9aa1ac |
| primary | #3fb68f |
| positive | #4cc38a |
| negative | #f0857a |

### Surfaces

- Radius is 10px for surfaces and 8px for controls.
- Shadows are removed except on popovers and dialogs. Separation comes from the hairline border plus canvas contrast.
- `Card` keeps its API. Its default style becomes white with a hairline border and no shadow.
- A new `Section` pattern (a title row plus content, with no box) is used for page-level groupings that do not need a container.

## 2. App shell (`components/app-shell/*`)

### Sidebar (≥ 1280px)

- 240px wide, `sticky top-0 h-dvh`, so it is always full height. This fixes the gap bug.
- Light surface (card colour) with a right hairline. It is not navy.
- Top: wordmark (logo mark plus "FinPilot").
- Nav groups: "Workspace" (Overview, Customers) and "Admin" (Import transactions).
- Selected item: accent tint, accent-foreground text and a 2px left indicator.
- User menu pinned to the bottom.

### Rail and mobile

- At 768–1279px: a 64px rail with the same logic and tooltips.
- Below 768px: the existing sheet navigation, restyled.

### Top bar

- 56px high, canvas colour with a bottom hairline, sticky.
- **Left:** breadcrumb on detail pages, or the page context.
- **Right:** ⌘K search trigger (240px), "Data as of {date}" chip (from data already fetched, shown when available), theme toggle.

### Content area

- Max width 1360px, 32px gutters on desktop and 16px on mobile.

## 3. Overview (`features/overview/*`)

Order, top to bottom:

1. **Page header:** "Overview" at 28px, with a muted line "Firm-wide book as of {date}".
2. **Hero band** (one surface):
   - The left block holds "Assets under management", the AUM at 40px, and the full ₹ value muted beneath.
   - A divider row follows with four secondary stats in a row: Customers (with "N with holdings"), Accounts ("N active"), Transactions, Goals.
   - Each stat is a 20px figure with a 12px label, separated by vertical hairlines. Stats wrap to 2×2 on mobile.
3. **Allocation** (full width): one horizontal stacked bar, 12px high with rounded ends. Below it is a legend grid: dot, class name, weight %, compact ₹ value. The full value is shown in a `title` tooltip.
4. **Grid row A (12 columns at ≥ 1024px):**
   - Net invested per month (8 columns). Bars use the primary colour at reduced saturation; negative months use the negative colour. The Chart/Table toggle is kept.
   - Top customers by AUM (4 columns). This is the top 5 (`MAX_ROWS = 5`): rank, initials avatar, name, mono ID, compact AUM, plus "View all".
5. **Grid row B:**
   - Goals at risk (8 columns), titled "High-priority goals under 25% funded". A dense two-column list becomes a table-like list: customer · goal type, progress bar (warning colour), funded % and "₹x of ₹y", and due date.
   - Data quality (4 columns): counts as a compact list with grouped headers.
6. **Row C:** Most widely held (top 5), full width (12 columns), as a compact table: symbol, name, class dot, and holders, with a holders bar. No holes.

Rows use `items-stretch` so paired surfaces are the same height.

## 4. Customers list (`features/customers/customers-*`)

- Page header: "Customers" and "{n} customers in the book".
- Toolbar row with no box around it: search input (flex-1), then KYC status, Segment and Sort selects.
- One table surface:
  - Sticky header.
  - Header cells at 12px muted, sentence case.
  - Rows 56px high with hover tint.
- Columns:
  - **Customer:** 32px initials avatar, name (14/500) and email (12 muted).
  - **ID** in mono.
  - **Location.**
  - **KYC:** a 6px coloured dot plus text.
  - **Segment:** a neutral tag. HNI gets an accent tag.
  - **Accounts:** right-aligned.
  - **AUM:** right-aligned tabular, with "No holdings" muted.
  - A chevron.
- The pagination bar sits in the table footer.

## 5. Customer detail (`features/customers/customer-*`, `portfolio/*`, `transactions/*`, `goals/*`)

### Header surface

- **Left:** name at 28px, then mono ID, KYC dot-text and segment tag. A contact line (city, email, phone) in muted 13px follows.
- **Right:** "Customer since".
- **Tabs:** underline style beneath the header, with the accent indicator.

### Portfolio

- A freshness line (snapshot and price dates) as a muted inline row, not a banner box.
- **Summary strip:** one surface with four cells (Market value, Invested, Unrealised P/L, Accounts) separated by hairlines. P/L is coloured on the figure only, with an arrow.
- **Positions table:**
  - Instrument: asset-class dot, mono symbol, then name and sector.
  - Account in mono.
  - Numeric columns right-aligned.
  - Unrealised P/L shows the coloured figure with the % below.
  - Weight shows % plus a 48px micro bar.
  - Filters sit in the table's title row.

### Transactions

- The same toolbar-and-table pattern.
- Status uses dot plus text and keeps `data-status` and the hover `title`.
- Reversed rows are struck through; pending rows are tinted.

### Goals

- Goal cards use the new surface style, with a progress bar and flag badges restyled as dot plus text.
- The form dialog is restyled. Fields and validation are unchanged.

### Overview tab

- The existing cards adopt the new surfaces and hierarchy.

## 6. Import and login

- **Import:** single column (as recorded in `DECISIONS.md`). The dropzone and summary adopt the new tokens. Summary counts use a stat strip, and the errors table uses the table pattern.
- **Login:** a centred column on the canvas:
  - logo mark and "FinPilot" above;
  - a 400px white surface with the "Sign in" heading, Work email, Password and the primary button;
  - the demo note and the HttpOnly note below in muted 12px.
  - The navy half panel is removed. Headings and labels keep their accessible names.

## 7. Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` must all pass. Tests change only where markup was intentionally replaced.
- The E2E suite (30 checks) must pass against the rebuilt web container.
- Screenshots at 375/768/1024/1440 in light and dark, for each page. They are compared with the "before" set and shown to the user before merging.
- Contrast spot-checks of the token pairs listed above.

## Out of scope

- New data, new endpoints, and AUM history.
- Changes to routing or auth.
- New dependencies, apart from the Geist font loaded through `next/font`.
