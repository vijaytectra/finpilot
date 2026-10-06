import type { Metadata } from "next";
import { Suspense } from "react";

import { TransactionsTab } from "@/features/transactions/components/transactions-tab";

export const metadata: Metadata = { title: "Transactions" };

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return (
    <Suspense>
      <TransactionsTab customerId={customerId} />
    </Suspense>
  );
}
