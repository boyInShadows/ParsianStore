import {
  adminCustomerDetailResponseSchema,
  adminCustomerDetailViewResponseSchema,
  adminCustomerListResponseSchema,
  type AccountTypeDto,
  type AdminCustomerDetailDto,
  type AdminCustomerDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AdminCustomerActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

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
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.phone) params.set("phone", filters.phone);
    if (filters.accountType) params.set("accountType", filters.accountType);
    const res = await fetch(`${API_URL}/api/v1/admin/customers?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = adminCustomerListResponseSchema.safeParse(json);
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

export async function fetchAdminCustomerDetail(id: string): Promise<AdminCustomerDetailDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/customers/${id}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const parsed = adminCustomerDetailViewResponseSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    return parsed.data.data;
  } catch {
    return null;
  }
}

export async function setAdminCustomerAccountType(
  id: string,
  accountType: AccountTypeDto,
): Promise<AdminCustomerActionResult<AdminCustomerDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/customers/${id}/account-type`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountType }),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = adminCustomerDetailResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, message: GENERIC_ERROR };
    return { ok: true, data: parsed.data.data };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
