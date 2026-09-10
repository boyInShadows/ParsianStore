import type { CityDto, ProvinceDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { localized } from "../../utils/serialize.js";

interface ProvinceRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
}

interface CityRow extends ProvinceRow {
  provinceId: string;
}

function toProvinceDto(row: ProvinceRow): ProvinceDto {
  return { id: row.id, name: localized(row), slug: row.slug };
}

function toCityDto(row: CityRow): CityDto {
  return { id: row.id, provinceId: row.provinceId, name: localized(row), slug: row.slug };
}

export async function listProvinces(
  pagination: PaginationQuery,
): Promise<PaginatedResult<ProvinceDto>> {
  const { data, meta } = await paginate<ProvinceRow>(prisma.province, "Province", {}, pagination);
  return { data: data.map(toProvinceDto), meta };
}

export async function listCities(
  provinceId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<CityDto>> {
  const { data, meta } = await paginate<CityRow>(
    prisma.city,
    "City",
    provinceId ? { provinceId } : {},
    pagination,
  );
  return { data: data.map(toCityDto), meta };
}
