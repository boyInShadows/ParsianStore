import {
  adminDashboardResponseSchema,
  type AdminDashboardDto,
  type DashboardRangeDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchAdminDashboard(
  range: DashboardRangeDto,
): Promise<AdminDashboardDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/dashboard?range=${range}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const parsed = adminDashboardResponseSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    return parsed.data.data;
  } catch {
    return null;
  }
}
