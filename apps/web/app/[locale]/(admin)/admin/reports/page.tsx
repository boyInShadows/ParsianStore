import { AdminShell } from "@/components/admin/AdminShell";
import { AdminReportsContent } from "@/components/admin/AdminReportsContent";
export default function AdminReportsPage() {
  return (
    <AdminShell active="reports">
      <AdminReportsContent />
    </AdminShell>
  );
}
