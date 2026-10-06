import type { Metadata } from "next";

import { OverviewPage } from "@/features/overview/components/overview-page";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <OverviewPage />;
}
