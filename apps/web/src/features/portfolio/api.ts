import { apiFetch } from "@/lib/api/client";

import type { Portfolio } from "./types";

export const portfolioApi = {
  get: (customerId: string, signal?: AbortSignal) =>
    apiFetch<Portfolio>(`/customers/${encodeURIComponent(customerId)}/portfolio`, { signal }),
};
