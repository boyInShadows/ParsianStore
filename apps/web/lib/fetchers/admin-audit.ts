import {
  adminAuditLogListResponseSchema,
  type AdminAuditLogDto,
  type AuditMethodDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const res = await fetch(`${API_URL}/api/v1/admin/audit?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const parsed = adminAuditLogListResponseSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    return {
      data: parsed.data.data,
      total: parsed.data.meta.total,
      page: parsed.data.meta.page,
      limit: parsed.data.meta.limit,
    };
  } catch {
    return null;
  }
}
