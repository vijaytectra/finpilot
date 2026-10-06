import type { components, operations } from "@/lib/api/schema";

export type CustomerListItem = components["schemas"]["CustomerListItem"];
export type CustomerPage = components["schemas"]["CustomerPage"];
export type CustomerProfile = components["schemas"]["CustomerProfile"];
export type RiskProfile = components["schemas"]["RiskProfileOut"];
export type KycStatus = components["schemas"]["KycStatus"];
export type Segment = components["schemas"]["Segment"];

type ListQuery = NonNullable<operations["list_customers_api_v1_customers_get"]["parameters"]["query"]>;
export type CustomerSort = NonNullable<ListQuery["sort"]>;

export const KYC_STATUSES: readonly KycStatus[] = ["VERIFIED", "PENDING", "REVIEW"];
export const SEGMENTS: readonly Segment[] = ["Mass", "Affluent", "HNI"];
export const CUSTOMER_SORTS: readonly CustomerSort[] = ["customer_id", "full_name", "city", "-aum", "aum", "-onboarded_at"];

export interface CustomerListParams {
  search?: string;
  kyc_status?: KycStatus;
  segment?: Segment;
  sort: CustomerSort;
  page: number;
  page_size: number;
}
