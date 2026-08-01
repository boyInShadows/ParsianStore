import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCouponFormContent } from "@/components/admin/AdminCouponFormContent";

export default function AdminNewDiscountPage() {
  return (
    <AdminShell active="discounts">
      <AdminCouponFormContent mode="create" />
    </AdminShell>
  );
}
