import { AdminShell } from "@/components/admin/AdminShell";
import { AdminAuditListContent } from "@/components/admin/AdminAuditListContent";

// P8.S8: the read side of the audit trail. Writes have happened via the
// auditLog() middleware since P8.S1; nothing read them back until now.
export default function AdminAuditPage() {
  return (
    <AdminShell active="audit">
      <AdminAuditListContent />
    </AdminShell>
  );
}
