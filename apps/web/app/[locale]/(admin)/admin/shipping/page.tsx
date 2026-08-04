import { AdminShell } from "@/components/admin/AdminShell";
import { AdminShippingRatesContent } from "@/components/admin/AdminShippingRatesContent";

// P8.S9: masterPlan §5's "/admin/shipping". Until now the only way to
// change a courier price was re-running seed/shipping.ts by hand.
export default function AdminShippingPage() {
  return (
    <AdminShell active="shipping">
      <AdminShippingRatesContent />
    </AdminShell>
  );
}
