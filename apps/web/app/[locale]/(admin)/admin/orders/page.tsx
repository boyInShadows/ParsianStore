import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOrdersListContent } from "@/components/admin/AdminOrdersListContent";

export default function AdminOrdersPage() {
  return (
    <AdminShell active="orders">
      <AdminOrdersListContent />
    </AdminShell>
  );
}
