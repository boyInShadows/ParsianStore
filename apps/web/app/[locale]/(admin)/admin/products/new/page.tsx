import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProductFormContent } from "@/components/admin/AdminProductFormContent";

export default function AdminNewProductPage() {
  return (
    <AdminShell active="products">
      <AdminProductFormContent mode="create" />
    </AdminShell>
  );
}
