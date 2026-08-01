import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCustomersListContent } from "@/components/admin/AdminCustomersListContent";

export default function AdminCustomersPage() {
  return (
    <AdminShell active="customers">
      <AdminCustomersListContent />
    </AdminShell>
  );
}
