"use client";

import { useQuery } from "@tanstack/react-query";

import { portfolioApi } from "./api";

export const portfolioKeys = {
  detail: (customerId: string) => ["portfolio", customerId] as const,
};

export function usePortfolio(customerId: string) {
  return useQuery({
    queryKey: portfolioKeys.detail(customerId),
    queryFn: ({ signal }) => portfolioApi.get(customerId, signal),
  });
}
