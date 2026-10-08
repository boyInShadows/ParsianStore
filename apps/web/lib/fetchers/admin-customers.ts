import {
  adminCustomerDetailResponseSchema,
  adminCustomerDetailViewResponseSchema,
  adminCustomerListResponseSchema,
  type AccountTypeDto,
  type AdminCustomerDetailDto,
  type AdminCustomerDto,
} from "schemas";
import { API_URL, apiAction, apiFetch, jsonBody, toPage, type ActionResult } from "@/lib/api-fetch";

export type AdminCustomerActionResult<T> = ActionResult<T>;

export interface AdminCustomerListPage {
  data: AdminCustomerDto[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAdminCustomers(
  page: number,
  limit: number,
  filters: { phone?: string; accountType?: AccountTypeDto } = {},
): Promise<AdminCustomerListPage | null> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.phone) params.set("phone", filters.phone);
  if (filters.accountType) params.set("accountType", filters.accountType);
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/customers?${params.toString()}`,
    adminCustomerListResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? toPage(res.data) : null;
}

export async function fetchAdminCustomerDetail(id: string): Promise<AdminCustomerDetailDto | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/customers/${id}`,
    adminCustomerDetailViewResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? res.data.data : null;
}

export function setAdminCustomerAccountType(
  id: string,
  accountType: AccountTypeDto,
): Promise<AdminCustomerActionResult<AdminCustomerDto>> {
  return apiAction(
    `${API_URL}/api/v1/admin/customers/${id}/account-type`,
    adminCustomerDetailResponseSchema,
    { method: "PATCH", credentials: "include", ...jsonBody({ accountType }) },
  );
}
