"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { transactionsApi } from "./api";
import type { TransactionFilters } from "./types";

export const transactionKeys = {
  all: (customerId: string) => ["transactions", customerId] as const,
  list: (customerId: string, filters: TransactionFilters) => [...transactionKeys.all(customerId), "list", filters] as const,
  facets: (customerId: string) => [...transactionKeys.all(customerId), "facets"] as const,
};

export function useTransactions(customerId: string, filters: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(customerId, filters),
    queryFn: ({ signal }) => transactionsApi.list(customerId, filters, signal),
    // Keep the previous page on screen while the next one loads (no table flicker).
    placeholderData: keepPreviousData,
  });
}

export function useTransactionFacets(customerId: string) {
  return useQuery({
    queryKey: transactionKeys.facets(customerId),
    queryFn: ({ signal }) => transactionsApi.facets(customerId, signal),
    staleTime: 5 * 60_000,
  });
}
