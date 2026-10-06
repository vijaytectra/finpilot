"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { customersApi } from "./api";
import type { CustomerListParams } from "./types";

export const customerKeys = {
  all: ["customers"] as const,
  list: (params: CustomerListParams) => [...customerKeys.all, "list", params] as const,
  detail: (customerId: string) => [...customerKeys.all, "detail", customerId] as const,
};

export function useCustomers(params: CustomerListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ signal }) => customersApi.list(params, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: customerKeys.detail(customerId),
    queryFn: ({ signal }) => customersApi.get(customerId, signal),
  });
}
