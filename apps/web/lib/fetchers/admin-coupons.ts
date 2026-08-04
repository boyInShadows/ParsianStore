import {
  adminCouponDetailResponseSchema,
  adminCouponListResponseSchema,
  type AdminCouponDto,
  type AdminCreateCouponInput,
  type AdminUpdateCouponInput,
  type CouponTypeDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AdminCouponActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

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

// Client-side only, credentials:"include" -- same reasoning
// lib/fetchers/admin-products.ts documents: this surface is inherently
// interactive (filters, pagination, forms).

export interface AdminCouponListPage {
  data: AdminCouponDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminCouponFilters {
  type?: CouponTypeDto;
  active?: "true" | "false";
  code?: string;
}

export async function fetchAdminCoupons(
  page: number,
  limit: number,
  filters: AdminCouponFilters = {},
): Promise<AdminCouponListPage | null> {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.type) params.set("type", filters.type);
    if (filters.active) params.set("active", filters.active);
    if (filters.code) params.set("code", filters.code);
    const res = await fetch(`${API_URL}/api/v1/admin/coupons?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = adminCouponListResponseSchema.safeParse(json);
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

export async function fetchAdminCoupon(id: string): Promise<AdminCouponDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/coupons/${id}`, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = adminCouponDetailResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

async function writeCoupon(
  url: string,
  method: "POST" | "PATCH",
  body?: AdminCreateCouponInput | AdminUpdateCouponInput,
): Promise<AdminCouponActionResult<AdminCouponDto>> {
  try {
    const res = await fetch(url, {
      method,
      credentials: "include",
      ...(body
        ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = adminCouponDetailResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, message: GENERIC_ERROR };
    return { ok: true, data: parsed.data.data };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export function createAdminCoupon(
  input: AdminCreateCouponInput,
): Promise<AdminCouponActionResult<AdminCouponDto>> {
  return writeCoupon(`${API_URL}/api/v1/admin/coupons`, "POST", input);
}

export function updateAdminCoupon(
  id: string,
  input: AdminUpdateCouponInput,
): Promise<AdminCouponActionResult<AdminCouponDto>> {
  return writeCoupon(`${API_URL}/api/v1/admin/coupons/${id}`, "PATCH", input);
}

export function deactivateAdminCoupon(
  id: string,
): Promise<AdminCouponActionResult<AdminCouponDto>> {
  return writeCoupon(`${API_URL}/api/v1/admin/coupons/${id}/deactivate`, "POST");
}
