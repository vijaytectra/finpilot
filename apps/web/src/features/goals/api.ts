import { apiFetch } from "@/lib/api/client";

import type { Goal, GoalCreate, GoalList, GoalUpdate } from "./types";

export const goalsApi = {
  list: (customerId: string, signal?: AbortSignal) =>
    apiFetch<GoalList>(`/customers/${encodeURIComponent(customerId)}/goals`, { signal }),
  create: (customerId: string, payload: GoalCreate) =>
    apiFetch<Goal>(`/customers/${encodeURIComponent(customerId)}/goals`, { method: "POST", body: payload }),
  update: (goalId: string, payload: GoalUpdate) =>
    apiFetch<Goal>(`/goals/${encodeURIComponent(goalId)}`, { method: "PATCH", body: payload }),
};
