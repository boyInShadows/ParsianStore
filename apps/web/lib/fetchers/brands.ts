import { brandResponseSchema, brandsResponseSchema, type BrandDto } from "schemas";
import { API_URL, apiFetch } from "@/lib/api-fetch";
import type { FetchResult } from "./catalog";

export async function fetchBrands(): Promise<BrandDto[]> {
  const res = await apiFetch(`${API_URL}/api/v1/catalog/brands?limit=100`, brandsResponseSchema);
  return res.ok ? res.data.data : [];
}

export async function fetchBrandBySlug(slug: string): Promise<FetchResult<BrandDto>> {
  const res = await apiFetch(`${API_URL}/api/v1/catalog/brands/${slug}`, brandResponseSchema);
  if (res.ok) return { ok: true, data: res.data.data };
  return { ok: false, reason: res.res?.status === 404 ? "not-found" : "down" };
}
