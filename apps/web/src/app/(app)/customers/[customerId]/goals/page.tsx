import type { Metadata } from "next";

import { GoalsTab } from "@/features/goals/components/goals-tab";

export const metadata: Metadata = { title: "Goals" };

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <GoalsTab customerId={customerId} />;
}
