import {
  provinceListResponseSchema,
  cityListResponseSchema,
  type ProvinceDto,
  type CityDto,
} from "schemas";
import { API_URL, apiFetch } from "@/lib/api-fetch";

// Client-side only. First real web consumer of /geo/provinces and
// /geo/cities (P2.S7) -- the address form's province->city cascade
// (P6.S6). `limit=100` on provinces because there are 31 of them
// (default page size is 20) -- cities per province are few enough
// (capital + major cities) that the default limit never truncates.

export async function fetchProvinces(): Promise<ProvinceDto[] | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/geo/provinces?limit=100`,
    provinceListResponseSchema,
  );
  return res.ok ? res.data.data : null;
}

export async function fetchCities(provinceId: string): Promise<CityDto[] | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/geo/cities?provinceId=${provinceId}&limit=100`,
    cityListResponseSchema,
  );
  return res.ok ? res.data.data : null;
}
