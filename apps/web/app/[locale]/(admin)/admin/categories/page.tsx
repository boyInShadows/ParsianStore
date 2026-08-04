import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCategoriesListContent } from "@/components/admin/AdminCategoriesListContent";

export default function AdminCategoriesPage() {
  return (
    <AdminShell active="catalog">
      <AdminCategoriesListContent />
    </AdminShell>
  );
}
