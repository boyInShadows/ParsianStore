import { AdminShell } from "@/components/admin/AdminShell";
import { AdminAttributesListContent } from "@/components/admin/AdminAttributesListContent";

export default function AdminAttributesPage() {
  return (
    <AdminShell active="catalog">
      <AdminAttributesListContent />
    </AdminShell>
  );
}
