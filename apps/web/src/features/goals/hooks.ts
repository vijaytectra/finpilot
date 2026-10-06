"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { customerKeys } from "@/features/customers/hooks";
import { overviewKeys } from "@/features/overview/hooks";

import { goalsApi } from "./api";
import type { GoalCreate, GoalUpdate } from "./types";

export const goalKeys = {
  list: (customerId: string) => ["goals", customerId] as const,
};

export function useGoals(customerId: string) {
  return useQuery({
    queryKey: goalKeys.list(customerId),
    queryFn: ({ signal }) => goalsApi.list(customerId, signal),
  });
}

function useInvalidateGoals(customerId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: goalKeys.list(customerId) }),
      // Goal counts on the profile and the firm-wide underfunded list depend on goals too.
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) }),
      queryClient.invalidateQueries({ queryKey: overviewKeys.all }),
    ]);
}

export function useCreateGoal(customerId: string) {
  const invalidate = useInvalidateGoals(customerId);
  return useMutation({
    mutationFn: (payload: GoalCreate) => goalsApi.create(customerId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateGoal(customerId: string) {
  const invalidate = useInvalidateGoals(customerId);
  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: GoalUpdate }) => goalsApi.update(goalId, payload),
    onSuccess: invalidate,
  });
}
