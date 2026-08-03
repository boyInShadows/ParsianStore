import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";

// P8.S5: /admin was a redirect to /admin/orders because no real overview
// existed to send staff to. It does now -- this is the nav hub the P8.S1
// comment said this route would become once enough of Phase 8 landed.
export default function AdminIndexPage() {
  return (
    <AdminShell active="dashboard">
      <AdminDashboardContent />
    </AdminShell>
  );
}
