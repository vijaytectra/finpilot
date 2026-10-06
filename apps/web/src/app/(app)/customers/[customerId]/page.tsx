import { CustomerOverviewTab } from "@/features/customers/components/customer-overview-tab";

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <CustomerOverviewTab customerId={customerId} />;
}
