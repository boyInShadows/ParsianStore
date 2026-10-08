import {
  adminDashboardResponseSchema,
  type AdminDashboardDto,
  type DashboardRangeDto,
} from "schemas";
import { API_URL, apiFetch } from "@/lib/api-fetch";

export async function fetchAdminDashboard(
  range: DashboardRangeDto,
): Promise<AdminDashboardDto | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/dashboard?range=${range}`,
    adminDashboardResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? res.data.data : null;
}
