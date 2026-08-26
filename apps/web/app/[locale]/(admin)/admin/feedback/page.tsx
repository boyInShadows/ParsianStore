import { AdminFeedbackContent } from "@/components/admin/AdminFeedbackContent";
import { AdminShell } from "@/components/admin/AdminShell";
export default function AdminFeedbackPage() {
  return (
    <AdminShell active="feedback">
      <AdminFeedbackContent />
    </AdminShell>
  );
}
