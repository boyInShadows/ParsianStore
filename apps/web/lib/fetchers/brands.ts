import { brandResponseSchema, brandsResponseSchema, type BrandDto } from "schemas";
import type { FetchResult } from "./catalog";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchBrands(): Promise<BrandDto[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/brands?limit=100`);
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = brandsResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : [];
  } catch {
    return [];
  }
}

export async function fetchBrandBySlug(slug: string): Promise<FetchResult<BrandDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/brands/${slug}`);
    if (res.status === 404) return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = brandResponseSchema.safeParse(json);
    return parsed.success ? { ok: true, data: parsed.data.data } : { ok: false, reason: "down" };
  } catch {
    return { ok: false, reason: "down" };
  }
}
