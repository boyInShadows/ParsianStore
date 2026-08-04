import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOrderDetailContent } from "@/components/admin/AdminOrderDetailContent";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell active="orders">
      <AdminOrderDetailContent id={id} />
    </AdminShell>
  );
}
