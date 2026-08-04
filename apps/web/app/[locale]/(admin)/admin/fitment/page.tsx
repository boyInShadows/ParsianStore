import { AdminShell } from "@/components/admin/AdminShell";
import { AdminFitmentListContent } from "@/components/admin/AdminFitmentListContent";

// P8.S6 §3.7 "Fitment Manager". Shares the vehicles nav entry and tab bar
// -- one job split across two screens, same as the catalog trio.
export default function AdminFitmentPage() {
  return (
    <AdminShell active="vehicles">
      <AdminFitmentListContent />
    </AdminShell>
  );
}
