import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCouponEditContent } from "@/components/admin/AdminCouponEditContent";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDiscountEditPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell active="discounts">
      <AdminCouponEditContent id={id} />
    </AdminShell>
  );
}
