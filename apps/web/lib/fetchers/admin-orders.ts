import {
  adminOrderDetailResponseSchema,
  adminOrderListResponseSchema,
  type AdminOrderDetailDto,
  type AdminOrderSummaryDto,
  type OrderStatusDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AdminOrderActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

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

// Client-side only, credentials:"include" -- /admin/orders is
// requireAuth+requireStaff()-gated (P8.S1). The admin order list page is
// inherently interactive (status filter, pagination, and the detail
// page's status-update form all need client JS regardless), so unlike
// /orders' server-side gate this whole surface is client fetchers, same
// reasoning /addresses (P7.S2) already used for its own interactive page.

export interface AdminOrderListPage {
  data: AdminOrderSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAdminOrders(
  page: number,
  limit: number,
  status?: OrderStatusDto,
): Promise<AdminOrderListPage | null> {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    const res = await fetch(`${API_URL}/api/v1/admin/orders?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = adminOrderListResponseSchema.safeParse(json);
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

export async function fetchAdminOrder(id: string): Promise<AdminOrderDetailDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/orders/${id}`, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = adminOrderDetailResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

export async function updateAdminOrderStatus(
  id: string,
  status: OrderStatusDto,
  note?: string,
): Promise<AdminOrderActionResult<AdminOrderDetailDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/orders/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: note || undefined }),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = adminOrderDetailResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
