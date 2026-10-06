# FinPilot web

Next.js 15 (App Router) front end for FinPilot: portfolio and goal monitoring for the
wealth-service team. Every number on screen comes from the FinPilot API; the browser only
formats values, it never computes financial figures.

## Quick start

```bash
cp .env.example .env.local      # point API_INTERNAL_URL at a running API
npm ci
npm run dev                     # http://localhost:3000
```

The API must be running (see `apps/api/README.md`). Demo credentials are listed in the
repository README.

## Scripts

| Script              | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                                                  |
| `npm run build`     | Production build (`output: "standalone"`), self-contained within `apps/web` |
| `npm run start`     | Serve the production build                                                  |
| `npm run lint`      | ESLint (flat config, `next/core-web-vitals` + `next/typescript`)            |
| `npm run typecheck` | `tsc --noEmit` (strict)                                                     |
| `npm run test`      | Vitest + Testing Library (jsdom)                                            |
| `npm run gen:api`   | Regenerate `src/lib/api/schema.d.ts` from `../../docs/api/openapi.json`     |

`gen:api` is deliberately not part of `build`: the generated types are committed so the
Docker build context (`apps/web` only) never needs files from outside this folder. Run it
whenever the OpenAPI spec changes and commit the result.

## Environment

| Variable           | Where       | Default                 | Purpose                                         |
| ------------------ | ----------- | ----------------------- | ----------------------------------------------- |
| `API_INTERNAL_URL` | server only | `http://localhost:8000` | Target of the `/api/:path*` rewrite to the API. |

The browser always calls same-origin `/api/v1/...`; `next.config.ts` rewrites those
requests to `API_INTERNAL_URL`. Because the session cookie (`finpilot_session`, HttpOnly)
is therefore first-party, no CORS setup is needed and no token is ever visible to
JavaScript. Rewrites are resolved at build time, so set `API_INTERNAL_URL` when building
the production image.

## Architecture

```
src/
  app/                      routes only (thin pages; layouts; error/not-found boundaries)
    login/                  public sign-in page
    (app)/                  authenticated area wrapped in the app shell
      page.tsx              overview dashboard
      customers/            search, and [customerId]/{overview,portfolio,transactions,goals}
      admin/import/         ADMIN-only CSV import
  middleware.ts             redirects cookie-less requests to /login?next=...
  features/<feature>/       auth, customers, overview, portfolio, transactions, goals, imports
    api.ts                  typed calls through apiFetch
    hooks.ts                TanStack Query hooks + query-key factories
    types.ts                aliases over the generated OpenAPI types
    components/             feature UI
  components/               shared UI: app shell, charts, states, pagination, shadcn/ui
  lib/                      api client, query client, formatters, safe redirect
```

- **Server state:** TanStack Query only. No retries on 4xx; any 401 clears the cache and
  redirects to `/login?next=...` (login/logout mutations opt out). Lists use
  `keepPreviousData` so pagination never flickers. Mutations invalidate exactly the
  affected queries.
- **URL state:** filters, sort, pagination and selected import batch live in the query
  string, so every view is shareable and the back button works.
- **Forms:** React Hook Form + Zod. The goal schema mirrors the API's rules, amounts stay
  decimal strings (compared as integer paise), edits send only changed fields, and API
  422 `details[].field` errors are mapped back onto the matching inputs.
- **Errors:** every section owns its loading skeleton, empty state and error state (with
  "Try again" and the API `request_id`), so one failing endpoint never blanks a page.
- **Formatting:** `en-IN` currency with lakh/crore grouping, compact `₹12.45 L` /
  `₹5.28 Cr` labels on cards, dates as `18 Sep 2026`. Gains and losses always carry a
  sign and an arrow, never colour alone.
- **Accessibility:** semantic landmarks, skip link, labelled inputs, visible focus,
  `aria-sort` on sortable headers, `aria-live` for toasts and import results, charts as
  `role="img"` with a summary plus an adjacent data table.

## Tests

`npm run test` covers formatters, the API client, transaction filter <-> query mapping,
goal form validation and 422 mapping, the post-login redirect guard, status badges, CSV
pre-validation, and page-level tests (customers page, goal dialog) against a mocked
`fetch`.
