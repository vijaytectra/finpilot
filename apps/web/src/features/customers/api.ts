import { apiFetch } from "@/lib/api/client";

import type { CustomerListParams, CustomerPage, CustomerProfile } from "./types";

export const customersApi = {
  list: (params: CustomerListParams, signal?: AbortSignal) =>
    apiFetch<CustomerPage>("/customers", { query: { ...params }, signal }),
  get: (customerId: string, signal?: AbortSignal) =>
    apiFetch<CustomerProfile>(`/customers/${encodeURIComponent(customerId)}`, { signal }),
};
