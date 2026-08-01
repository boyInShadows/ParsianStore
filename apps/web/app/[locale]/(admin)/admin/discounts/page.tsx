import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCouponsListContent } from "@/components/admin/AdminCouponsListContent";

export default function AdminDiscountsPage() {
  return (
    <AdminShell active="discounts">
      <AdminCouponsListContent />
    </AdminShell>
  );
}
