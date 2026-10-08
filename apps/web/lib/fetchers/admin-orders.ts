import {
  adminOrderDetailResponseSchema,
  adminOrderListResponseSchema,
  type AdminOrderDetailDto,
  type AdminOrderSummaryDto,
  type OrderStatusDto,
} from "schemas";
import { API_URL, apiAction, apiFetch, jsonBody, toPage, type ActionResult } from "@/lib/api-fetch";

export type AdminOrderActionResult<T> = ActionResult<T>;

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
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/orders?${params.toString()}`,
    adminOrderListResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? toPage(res.data) : null;
}

export async function fetchAdminOrder(id: string): Promise<AdminOrderDetailDto | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/orders/${id}`,
    adminOrderDetailResponseSchema,
    {
      credentials: "include",
    },
  );
  return res.ok ? res.data.data : null;
}

export function updateAdminOrderStatus(
  id: string,
  status: OrderStatusDto,
  note?: string,
): Promise<AdminOrderActionResult<AdminOrderDetailDto>> {
  return apiAction(`${API_URL}/api/v1/admin/orders/${id}/status`, adminOrderDetailResponseSchema, {
    method: "PATCH",
    credentials: "include",
    ...jsonBody({ status, note: note || undefined }),
  });
}
