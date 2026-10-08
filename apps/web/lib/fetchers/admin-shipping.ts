import {
  adminShippingRateDetailResponseSchema,
  adminShippingRateListResponseSchema,
  type AdminCreateShippingRateInput,
  type AdminShippingRateDto,
} from "schemas";
import { API_URL, apiAction, apiFetch, jsonBody, toPage, type ActionResult } from "@/lib/api-fetch";

const BASE = `${API_URL}/api/v1/admin/shipping/rates`;

export type AdminShippingResult<T> = ActionResult<T>;

export interface AdminShippingRatePage {
  data: AdminShippingRateDto[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAdminShippingRates(
  page: number,
  limit: number,
  filters: { state?: "active" | "deleted" } = {},
): Promise<AdminShippingRatePage | null> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.state) params.set("state", filters.state);
  const res = await apiFetch(`${BASE}?${params.toString()}`, adminShippingRateListResponseSchema, {
    credentials: "include",
  });
  return res.ok ? toPage(res.data) : null;
}

function write(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<AdminShippingResult<AdminShippingRateDto | null>> {
  // The 409 the overlap guard returns names the conflicting bracket in
  // Persian -- swallowing it for a generic string would defeat the point
  // of the guard.
  return apiAction(
    `${BASE}${path}`,
    method === "DELETE" ? null : adminShippingRateDetailResponseSchema,
    { method, credentials: "include", ...(body === undefined ? {} : jsonBody(body)) },
  );
}

export function createAdminShippingRate(
  input: AdminCreateShippingRateInput,
): Promise<AdminShippingResult<AdminShippingRateDto | null>> {
  return write("", "POST", input);
}

export function updateAdminShippingRate(
  id: string,
  input: AdminCreateShippingRateInput,
): Promise<AdminShippingResult<AdminShippingRateDto | null>> {
  return write(`/${id}`, "PATCH", input);
}

export function deleteAdminShippingRate(
  id: string,
): Promise<AdminShippingResult<AdminShippingRateDto | null>> {
  return write(`/${id}`, "DELETE");
}

export function restoreAdminShippingRate(
  id: string,
): Promise<AdminShippingResult<AdminShippingRateDto | null>> {
  return write(`/${id}/restore`, "POST");
}
