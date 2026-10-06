import { notFound } from "next/navigation";

import { CustomerLayout } from "@/features/customers/components/customer-layout";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  // Same id shape the API enforces; anything else can never exist.
  if (!/^C\d{4,}$/.test(customerId)) notFound();
  return <CustomerLayout customerId={customerId}>{children}</CustomerLayout>;
}
