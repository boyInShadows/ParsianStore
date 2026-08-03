import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCustomerDetailContent } from "@/components/admin/AdminCustomerDetailContent";

type Props = { params: Promise<{ id: string }> };

// P8.S7: the detail half of the customers surface. P8.S3 shipped the list
// and its account-type toggle; this is what a row now opens into.
export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell active="customers">
      <AdminCustomerDetailContent customerId={id} />
    </AdminShell>
  );
}
