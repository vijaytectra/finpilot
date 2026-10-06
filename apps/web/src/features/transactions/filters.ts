import type { QueryParams } from "@/lib/api/client";

import {
  TRANSACTION_SORTS,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type TransactionFilters,
  type TransactionSort,
  type TransactionStatus,
  type TransactionType,
} from "./types";

export const TRANSACTIONS_PAGE_SIZE = 25;

/** URL keys. `type` is shorter than the API's `transaction_type` but maps 1:1. */
export const TX_PARAM = {
  dateFrom: "date_from",
  dateTo: "date_to",
  account: "account_id",
  instrument: "instrument_id",
  type: "type",
  status: "status",
  sort: "sort",
  page: "page",
} as const;

type ReadonlySearchParams = Pick<URLSearchParams, "get" | "getAll">;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ACCOUNT_ID = /^A\d{5,}$/;
const INSTRUMENT_ID = /^I\d{4,}$/;

function pick<T extends string>(values: string[], allowed: readonly T[]): T[] {
  // Keep the canonical order and drop duplicates/unknowns so equal filters give equal query keys.
  const set = new Set(values);
  return allowed.filter((v) => set.has(v));
}

function matches(value: string | null, pattern: RegExp): string | undefined {
  return value && pattern.test(value) ? value : undefined;
}

/** URL → validated filter state. Anything malformed is ignored rather than sent to the API. */
export function parseTransactionFilters(params: ReadonlySearchParams): TransactionFilters {
  const sort = params.get(TX_PARAM.sort);
  const page = Number(params.get(TX_PARAM.page));
  return {
    date_from: matches(params.get(TX_PARAM.dateFrom), ISO_DATE),
    date_to: matches(params.get(TX_PARAM.dateTo), ISO_DATE),
    account_id: matches(params.get(TX_PARAM.account), ACCOUNT_ID),
    instrument_id: matches(params.get(TX_PARAM.instrument), INSTRUMENT_ID),
    transaction_type: pick<TransactionType>(params.getAll(TX_PARAM.type), TRANSACTION_TYPES),
    status: pick<TransactionStatus>(params.getAll(TX_PARAM.status), TRANSACTION_STATUSES),
    sort: (TRANSACTION_SORTS as readonly string[]).includes(sort ?? "") ? (sort as TransactionSort) : "-trade_date",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    page_size: TRANSACTIONS_PAGE_SIZE,
  };
}

/** Filter state → API query params (arrays are serialised as repeated keys by apiFetch). */
export function toTransactionQuery(filters: TransactionFilters): QueryParams {
  return {
    date_from: filters.date_from,
    date_to: filters.date_to,
    account_id: filters.account_id,
    instrument_id: filters.instrument_id,
    transaction_type: filters.transaction_type,
    status: filters.status,
    sort: filters.sort,
    page: filters.page,
    page_size: filters.page_size,
  };
}

/** Number of user-set filters (sort and page excluded), for the "Clear (n)" affordance. */
export function countActiveFilters(filters: TransactionFilters): number {
  return (
    (filters.date_from ? 1 : 0) +
    (filters.date_to ? 1 : 0) +
    (filters.account_id ? 1 : 0) +
    (filters.instrument_id ? 1 : 0) +
    (filters.transaction_type.length > 0 ? 1 : 0) +
    (filters.status.length > 0 ? 1 : 0)
  );
}

/** URL patch that clears every filter but keeps the sort order. */
export const CLEAR_TRANSACTION_FILTERS = {
  [TX_PARAM.dateFrom]: null,
  [TX_PARAM.dateTo]: null,
  [TX_PARAM.account]: null,
  [TX_PARAM.instrument]: null,
  [TX_PARAM.type]: null,
  [TX_PARAM.status]: null,
  [TX_PARAM.page]: null,
} as const;
