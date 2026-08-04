import {
  adminShippingRateDetailResponseSchema,
  adminShippingRateListResponseSchema,
  type AdminCreateShippingRateInput,
  type AdminShippingRateDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = `${API_URL}/api/v1/admin/shipping/rates`;

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

export type AdminShippingResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

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
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.state) params.set("state", filters.state);
    const res = await fetch(`${BASE}?${params.toString()}`, { credentials: "include" });
    if (!res.ok) return null;
    const parsed = adminShippingRateListResponseSchema.safeParse(await res.json());
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

async function write(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<AdminShippingResult<AdminShippingRateDto | null>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
    // The 409 the overlap guard returns names the conflicting bracket in
    // Persian -- swallowing it for a generic string would defeat the point
    // of the guard.
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    if (method === "DELETE") return { ok: true, data: null };
    const parsed = adminShippingRateDetailResponseSchema.safeParse(await res.json());
    if (!parsed.success) return { ok: false, message: GENERIC_ERROR };
    return { ok: true, data: parsed.data.data };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
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
