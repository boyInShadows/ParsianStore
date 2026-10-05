import {
  adminAuditLogListResponseSchema,
  type AdminAuditLogDto,
  type AuditMethodDto,
} from "schemas";
import { API_URL, apiFetch, toPage } from "@/lib/api-fetch";

export interface AdminAuditFilters {
  entity?: string;
  entityId?: string;
  method?: AuditMethodDto;
  from?: string;
  to?: string;
}

export interface AdminAuditPage {
  data: AdminAuditLogDto[];
  total: number;
  page: number;
  limit: number;
}

/**
 * `null` covers both "request failed" and "response did not match the
 * schema". The audit screen deliberately distinguishes that from an empty
 * page: showing "no activity yet" when the request actually 403'd would
 * misreport an access problem as a clean trail.
 */
export async function fetchAdminAuditLogs(
  page: number,
  limit: number,
  filters: AdminAuditFilters = {},
): Promise<AdminAuditPage | null> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/audit?${params.toString()}`,
    adminAuditLogListResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? toPage(res.data) : null;
}
