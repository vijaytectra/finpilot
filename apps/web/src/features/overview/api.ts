import { apiFetch } from "@/lib/api/client";

import type { Overview } from "./types";

export const overviewApi = {
  get: (signal?: AbortSignal) => apiFetch<Overview>("/reports/overview", { signal }),
};
