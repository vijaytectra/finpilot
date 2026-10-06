import type { Metadata } from "next";
import { Suspense } from "react";

import { PortfolioTab } from "@/features/portfolio/components/portfolio-tab";

export const metadata: Metadata = { title: "Portfolio" };

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return (
    <Suspense>
      <PortfolioTab customerId={customerId} />
    </Suspense>
  );
}
