# FinPilot UI revamp — design spec

**Date:** 2026-10-06 · **Status:** approved in brainstorming · **Scope:** `apps/web` presentation only

## Problem

On a laptop the app renders its phone layout. The desktop sidebar only appears at
`lg` (≥ 1024 px); with Windows display scaling of 125–150 % a typical laptop browser
viewport is ~900–1000 CSS px wide, so users get the top bar, hamburger menu and stacked
cards instead of a desktop web app. The visual style is also too plain to read as a
finished product.

## Goal

A professional, light-themed desktop web-app UI that only falls back to the phone
layout on actual phones — with **no change to behaviour**.

## Non-goals (must not change)

API calls, TanStack Query hooks and query keys, forms and their validation rules (Zod
schemas), the 422 → field mapping, URL/search-param state, routes, auth, `middleware.ts`,
`safe-redirect.ts`, `next.config.ts`, the backend, Docker, CI and docs. Files may be
touched only for markup, `className`s and styles. No new runtime dependencies.

## Approach

**Restyle in place.** Change design tokens (`globals.css`), the app-shell breakpoints and
the visual layer of existing components. Rejected: a parallel presentational layer (too
much churn for "UI only") and swapping the component library (rewrites forms/tables,
risks behaviour changes).

## 1. Layout and breakpoints

| Viewport | Layout |
|---|---|
| ≥ 768 px (`md`) | Fixed left sidebar + slim top bar (page title, search, user menu); full tables |
| 768–1279 px | Sidebar collapsed to icons with tooltips (72 px) |
| ≥ 1280 px (`xl`) | Sidebar with labels (240 px); two-column dashboard grids |
| ≥ 1440 px | Content max width ~1440 px, centred |
| < 768 px | Current phone layout: top bar, Sheet navigation, card lists, ≥ 44 px touch targets |

Every component that currently switches table ↔ cards or hides the sidebar at `lg`
switches at `md` instead.

## 2. Visual system

* **Shell:** deep-navy sidebar (white / slate-300 text; active item = indigo pill with a
  left accent bar; logo top, user card + sign-out bottom) on a cool-grey workspace
  (`#F4F6F9`).
* **Surfaces:** white cards, 1 px hairline border, very soft shadow, 10 px radius.
* **Accent:** single indigo `#4F46E5` for primary actions, links, active states and focus
  rings.
* **Semantic colours:** green gain, red loss, amber warning — always paired with a sign
  or icon; all text meets WCAG 2.1 AA (≥ 4.5:1, ≥ 3:1 for large text and UI graphics).
* **Typography:** Inter. Three levels: page title 24 px / 600, section title 15 px / 600,
  labels 12 px uppercase, tracking-wide, muted. Money and quantities use tabular figures
  (`tabular-nums`), right-aligned in tables.
* **KPI card:** small muted label → 28 px value → one context line.
* **Tables:** ~40 px rows, muted uppercase header, hover highlight, compact status badges.
  (Not sticky: every table is paginated inside a horizontal-scroll container, where a
  sticky header would never engage.)
* **Charts:** light gridlines, no chart junk, takeaway titles, data table always
  available (existing toggle / table kept).
* **Dark mode:** kept; tokens retuned to the new palette.
* All colours, radii and shadows defined once as CSS custom properties (design tokens).

## 3. Pages (desktop ≥ 768 px)

| Page | Layout |
|---|---|
| Login | Split screen: navy brand panel (logo, one-line description, synthetic-data note) + sign-in card. Phones: card only. |
| Overview | 6 KPI cards in one row (wraps 3×2 below 1280 px); then three 2:1 rows from 1024 px (was 1280 px): allocation (wide) · top customers; net flows (wide) · top instruments; underfunded goals (wide) · data quality. Pairings unchanged: the allocation donut + legend needs the wide column. |
| Customers | Header + one-line toolbar (search, KYC, segment, sort) + full-width dense table; pagination in the table footer. |
| Customer detail | Identity header card (name, ID, KYC/segment badges, location · e-mail · phone, customer-since) + underline route tabs (Overview · Portfolio · Transactions · Goals, already underline-style; kept). No mini KPIs in the header: the Overview tab already opens with value / invested / P&L / accounts cards, and showing them twice would also add a portfolio request on every tab. |
| Portfolio | Freshness banner, account cards row, positions table full width. |
| Transactions | One-row filter toolbar above a full-width table; reversed/pending row styling kept. |
| Goals | Card grid (3 across ≥ 1280 px, 2 across 768–1279 px) with funded-% bars; "Add goal" in the section header. |
| Admin › Import | Two columns: upload + result summary · import history; rejected-rows table full width below. |

Loading skeletons, empty states and error states (with `request_id`) are kept and
restyled to the same system.

## Verification

1. Existing 55 Vitest tests pass. Tests asserting behaviour (queries by role/text,
   request payloads, URL strings) are not edited; only assertions on purely visual markup
   may be updated, each called out in the PR.
2. `npm run lint`, `npm run typecheck`, `npm run build` pass.
3. Screenshots of every page at 375 / 768 / 1024 / 1440 px, light and dark, reviewed.
4. The 30-check end-to-end suite passes against the rebuilt Docker stack.
5. Delivered as a PR with before/after screenshots.

## Design references

Principles taken from the user-supplied Claude Skills Bundle (`ui-ux-fundamentals`,
`responsive-design-guide`, `visual-hierarchy-guide`, `design-system-guide`,
`data-visualization-guide`, `typography-guide`, `color-theory-guide`,
`design-for-accessibility`): standard breakpoints 320/768/1024/1440, ≥ 44 px touch
targets, three-level hierarchy and F-pattern layout, tokens as the foundation,
message-first charts, WCAG AA contrast.
