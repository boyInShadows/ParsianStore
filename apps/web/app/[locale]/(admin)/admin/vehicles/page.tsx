import { AdminShell } from "@/components/admin/AdminShell";
import { AdminVehicleTreeContent } from "@/components/admin/AdminVehicleTreeContent";

// P8.S6 §3.7. The four vehicle collections have had public read endpoints
// since P2.S6 and no write path outside a seed script.
export default function AdminVehiclesPage() {
  return (
    <AdminShell active="vehicles">
      <AdminVehicleTreeContent />
    </AdminShell>
  );
}
