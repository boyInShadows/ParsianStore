import {
  adminCouponDetailResponseSchema,
  adminCouponListResponseSchema,
  type AdminCouponDto,
  type AdminCreateCouponInput,
  type AdminUpdateCouponInput,
  type CouponTypeDto,
} from "schemas";
import { API_URL, apiAction, apiFetch, jsonBody, toPage, type ActionResult } from "@/lib/api-fetch";

export type AdminCouponActionResult<T> = ActionResult<T>;

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
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.type) params.set("type", filters.type);
  if (filters.active) params.set("active", filters.active);
  if (filters.code) params.set("code", filters.code);
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/coupons?${params.toString()}`,
    adminCouponListResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? toPage(res.data) : null;
}

export async function fetchAdminCoupon(id: string): Promise<AdminCouponDto | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/coupons/${id}`,
    adminCouponDetailResponseSchema,
    {
      credentials: "include",
    },
  );
  return res.ok ? res.data.data : null;
}

function writeCoupon(
  url: string,
  method: "POST" | "PATCH",
  body?: AdminCreateCouponInput | AdminUpdateCouponInput,
): Promise<AdminCouponActionResult<AdminCouponDto>> {
  return apiAction(url, adminCouponDetailResponseSchema, {
    method,
    credentials: "include",
    ...(body ? jsonBody(body) : {}),
  });
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
