import {
  orderListResponseSchema,
  orderDetailResponseSchema,
  type OrderSummaryDto,
  type OrderDetailDto,
} from "schemas";
import { API_URL, apiFetch, toPage } from "@/lib/api-fetch";

// Server-side only (called from the /orders and /orders/[code] Server
// Components with the incoming request's own cookies forwarded
// explicitly) -- same reasoning fetchSearchResults/fetchProductDetailBySlug
// already established: a plain server-side fetch() has no browser cookie
// jar to attach automatically, unlike a client fetch with
// credentials:"include". "unauthorized" is its own reason (distinct from
// "down") so the page component can redirect to /auth/login rather than
// show a generic API-down empty state for what's actually just "not
// signed in."
export type OrdersFetchResult<T> =
  { ok: true; data: T } | { ok: false; reason: "unauthorized" | "not-found" | "down" };

export interface OrderListPage {
  data: OrderSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchOrders(
  page: number,
  limit: number,
  cookieHeader: string,
): Promise<OrdersFetchResult<OrderListPage>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(
    `${API_URL}/api/v1/me/orders?${params.toString()}`,
    orderListResponseSchema,
    {
      headers: { cookie: cookieHeader },
    },
  );
  if (res.ok) return { ok: true, data: toPage(res.data) };
  return { ok: false, reason: res.res?.status === 401 ? "unauthorized" : "down" };
}

export async function fetchOrderByCode(
  code: string,
  cookieHeader: string,
): Promise<OrdersFetchResult<OrderDetailDto>> {
  const res = await apiFetch(
    `${API_URL}/api/v1/me/orders/${encodeURIComponent(code)}`,
    orderDetailResponseSchema,
    { headers: { cookie: cookieHeader } },
  );
  if (res.ok) return { ok: true, data: res.data.data };
  const status = res.res?.status;
  return {
    ok: false,
    reason: status === 401 ? "unauthorized" : status === 404 ? "not-found" : "down",
  };
}
