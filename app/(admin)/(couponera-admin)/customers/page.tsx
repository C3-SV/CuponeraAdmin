import { listCustomers } from "@/app/(admin)/(couponera-admin)/customers/actions";
import { CustomersList } from "@/components/customers/customers-list";

export default async function CustomersPage() {
  const initialList = await listCustomers();

  return <CustomersList initialList={initialList} />;
}
