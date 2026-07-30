import {
  orderListResponseSchema,
  orderDetailResponseSchema,
  type OrderSummaryDto,
  type OrderDetailDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await fetch(`${API_URL}/api/v1/me/orders?${params.toString()}`, {
      headers: { cookie: cookieHeader },
    });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = orderListResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: "down" };
    return {
      ok: true,
      data: {
        data: parsed.data.data,
        total: parsed.data.meta.total,
        page: parsed.data.meta.page,
        limit: parsed.data.meta.limit,
      },
    };
  } catch {
    return { ok: false, reason: "down" };
  }
}

export async function fetchOrderByCode(
  code: string,
  cookieHeader: string,
): Promise<OrdersFetchResult<OrderDetailDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/orders/${encodeURIComponent(code)}`, {
      headers: { cookie: cookieHeader },
    });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 404) return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = orderDetailResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: "down" };
    return { ok: true, data: parsed.data.data };
  } catch {
    return { ok: false, reason: "down" };
  }
}
