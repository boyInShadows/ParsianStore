import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductEditContent } from "@/components/admin/AdminProductEditContent";

type Props = { params: Promise<{ id: string }> };

export default async function AdminProductEditPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell active="products">
      <AdminProductEditContent id={id} />
    </AdminShell>
  );
}
