import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomersPage } from "@/features/customers/components/customers-page";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  // useSearchParams() needs a Suspense boundary for static prerendering.
  return (
    <Suspense>
      <CustomersPage />
    </Suspense>
  );
}
