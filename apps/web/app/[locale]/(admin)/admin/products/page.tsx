import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductsListContent } from "@/components/admin/AdminProductsListContent";

export default function AdminProductsPage() {
  return (
    <AdminShell active="products">
      <AdminProductsListContent />
    </AdminShell>
  );
}
