import type { components, operations } from "@/lib/api/schema";

export type Transaction = components["schemas"]["TransactionOut"];
export type TransactionPage = components["schemas"]["TransactionPage"];
export type TransactionFacets = components["schemas"]["TransactionFacets"];
export type FacetOption = components["schemas"]["FacetOption"];
export type TransactionType = components["schemas"]["TransactionType"];
export type TransactionStatus = components["schemas"]["TransactionStatus"];

type ListQuery = NonNullable<
  operations["list_transactions_api_v1_customers__customer_id__transactions_get"]["parameters"]["query"]
>;
export type TransactionSort = NonNullable<ListQuery["sort"]>;

export const TRANSACTION_TYPES: readonly TransactionType[] = ["BUY", "SELL", "DIVIDEND", "FEE"];
export const TRANSACTION_STATUSES: readonly TransactionStatus[] = ["SETTLED", "PENDING", "REVERSED"];
export const TRANSACTION_SORTS: readonly TransactionSort[] = ["-trade_date", "trade_date", "-amount", "amount"];

/** Filter state as held in the URL (and sent to the API). */
export interface TransactionFilters {
  date_from?: string;
  date_to?: string;
  account_id?: string;
  instrument_id?: string;
  transaction_type: TransactionType[];
  status: TransactionStatus[];
  sort: TransactionSort;
  page: number;
  page_size: number;
}
