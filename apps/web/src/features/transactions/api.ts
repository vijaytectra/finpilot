import { apiFetch } from "@/lib/api/client";

import { toTransactionQuery } from "./filters";
import type { TransactionFacets, TransactionFilters, TransactionPage } from "./types";

const base = (customerId: string) => `/customers/${encodeURIComponent(customerId)}/transactions`;

export const transactionsApi = {
  list: (customerId: string, filters: TransactionFilters, signal?: AbortSignal) =>
    apiFetch<TransactionPage>(base(customerId), { query: toTransactionQuery(filters), signal }),
  facets: (customerId: string, signal?: AbortSignal) =>
    apiFetch<TransactionFacets>(`${base(customerId)}/facets`, { signal }),
};
