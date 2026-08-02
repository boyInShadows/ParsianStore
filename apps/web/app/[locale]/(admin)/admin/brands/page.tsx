import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBrandsListContent } from "@/components/admin/AdminBrandsListContent";

export default function AdminBrandsPage() {
  return (
    <AdminShell active="catalog">
      <AdminBrandsListContent />
    </AdminShell>
  );
}
