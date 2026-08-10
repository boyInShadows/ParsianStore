import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPaymentsContent } from "@/components/admin/AdminPaymentsContent";
export default function AdminPaymentsPage() {
  return (
    <AdminShell active="payments">
      <AdminPaymentsContent />
    </AdminShell>
  );
}
