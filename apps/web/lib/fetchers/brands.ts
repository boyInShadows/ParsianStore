import { brandsResponseSchema, type BrandDto } from "schemas";

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
