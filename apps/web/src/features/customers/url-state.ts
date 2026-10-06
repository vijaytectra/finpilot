import { CUSTOMER_SORTS, KYC_STATUSES, SEGMENTS, type CustomerListParams, type CustomerSort, type KycStatus, type Segment } from "./types";

export const CUSTOMERS_PAGE_SIZE = 20;

type ReadonlySearchParams = Pick<URLSearchParams, "get">;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function positiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

/** URL → validated API params. Unknown or malformed values fall back to defaults. */
export function parseCustomerListParams(params: ReadonlySearchParams): CustomerListParams {
  const search = params.get("search")?.trim().slice(0, 100);
  return {
    search: search || undefined,
    kyc_status: oneOf<KycStatus>(params.get("kyc_status"), KYC_STATUSES),
    segment: oneOf<Segment>(params.get("segment"), SEGMENTS),
    sort: oneOf<CustomerSort>(params.get("sort"), CUSTOMER_SORTS) ?? "customer_id",
    page: positiveInt(params.get("page"), 1),
    page_size: CUSTOMERS_PAGE_SIZE,
  };
}

export const SORT_LABELS: Record<CustomerSort, string> = {
  customer_id: "Customer ID",
  full_name: "Name (A–Z)",
  city: "City (A–Z)",
  "-aum": "AUM (high to low)",
  aum: "AUM (low to high)",
  "-onboarded_at": "Newest onboarded",
};
