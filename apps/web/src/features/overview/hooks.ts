"use client";

import { useQuery } from "@tanstack/react-query";

import { overviewApi } from "./api";

export const overviewKeys = {
  all: ["overview"] as const,
};

export function useOverview() {
  return useQuery({
    queryKey: overviewKeys.all,
    queryFn: ({ signal }) => overviewApi.get(signal),
    staleTime: 5 * 60_000,
  });
}
