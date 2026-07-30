import {
  provinceListResponseSchema,
  cityListResponseSchema,
  type ProvinceDto,
  type CityDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Client-side only. First real web consumer of /geo/provinces and
// /geo/cities (P2.S7) -- the address form's province->city cascade
// (P6.S6). `limit=100` on provinces because there are 31 of them
// (default page size is 20) -- cities per province are few enough
// (capital + major cities) that the default limit never truncates.

export async function fetchProvinces(): Promise<ProvinceDto[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/geo/provinces?limit=100`);
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = provinceListResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

export async function fetchCities(provinceId: string): Promise<CityDto[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/geo/cities?provinceId=${provinceId}&limit=100`);
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = cityListResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}
