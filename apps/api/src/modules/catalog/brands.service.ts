import type { BrandDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { localized } from "../../utils/serialize.js";

// Shopper reads only — every write plus the admin-shaped reads, the delete
// guard and restore live in brands.admin.service.ts as of P8.S4.

export interface BrandRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  logo: string | null;
  country: string;
  isOEM: boolean;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/**
 * Rebuilds the `seo: { title?, description? }` object from the two columns.
 *
 * The shared schema defaults `seo` to `{}` with a comment explaining that
 * Mongoose omitted the empty nested object on seeded brands. That is no longer
 * why: Postgres has no nested object to omit, it has two nullable columns. The
 * shape is preserved anyway because the browser contract should not move when
 * the storage does, and a null column is simply left out rather than sent as an
 * empty string the client would then have to treat as absent.
 */
export function toBrandDto(row: BrandRow): BrandDto {
  return {
    id: row.id,
    name: localized(row),
    slug: row.slug,
    ...(row.logo ? { logo: row.logo } : {}),
    country: row.country,
    isOEM: row.isOEM,
    ...(row.description ? { description: row.description } : {}),
    seo: {
      ...(row.seoTitle ? { title: row.seoTitle } : {}),
      ...(row.seoDescription ? { description: row.seoDescription } : {}),
    },
  };
}

export async function listBrands(pagination: PaginationQuery): Promise<PaginatedResult<BrandDto>> {
  const { data, meta } = await paginate<BrandRow>(prisma.brand, "Brand", {}, pagination);
  return { data: data.map(toBrandDto), meta };
}

export async function getBrandBySlug(slug: string): Promise<BrandDto> {
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) {
    throw new ApiError(404, "برند یافت نشد");
  }
  return toBrandDto(brand);
}
