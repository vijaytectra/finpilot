import type { Metadata } from "next";
import { Suspense } from "react";

import { ImportPage } from "@/features/imports/components/import-page";

export const metadata: Metadata = { title: "Import transactions" };

export default function Page() {
  return (
    <Suspense>
      <ImportPage />
    </Suspense>
  );
}
