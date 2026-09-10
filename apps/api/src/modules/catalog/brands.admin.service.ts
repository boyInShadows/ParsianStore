import type { AdminBrandDto } from "schemas";
import { ANY_STATE, prisma, softDeleteData, stateFilter } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery, type Where } from "../../utils/pagination.js";
import { localized, optional, seo, seoColumns, toColumns } from "../../utils/serialize.js";
import { assertBrandDeletable, countProductsByBrand } from "./catalogUsage.js";
import type {
  AdminBrandListQuery,
  CreateBrandInput,
  UpdateBrandInput,
} from "./brands.admin.schema.js";

const NOT_FOUND = "برند یافت نشد";

type ListFilters = Omit<AdminBrandListQuery, keyof PaginationQuery>;

interface BrandRow {
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
  deletedAt: Date | null;
}

function buildListFilter(filters: ListFilters): Where {
  const where: Where = stateFilter(filters.state);
  if (filters.isOEM) where.isOEM = filters.isOEM === "true";
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [{ nameFa: contains }, { nameEn: contains }, { slug: contains }];
  }
  return where;
}

function toDto(row: BrandRow, productCount: number): AdminBrandDto {
  return {
    id: row.id,
    name: localized(row),
    slug: row.slug,
    logo: optional(row.logo),
    country: row.country,
    isOEM: row.isOEM,
    description: optional(row.description),
    seo: seo(row),
    productCount,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

async function hydrate(rows: BrandRow[]): Promise<AdminBrandDto[]> {
  const counts = await countProductsByBrand(rows.map((row) => row.id));
  return rows.map((row) => toDto(row, counts.get(row.id) ?? 0));
}

async function hydrateOne(row: BrandRow): Promise<AdminBrandDto> {
  const [dto] = await hydrate([row]);
  if (!dto) throw new ApiError(404, NOT_FOUND);
  return dto;
}

export async function listAdminBrands(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminBrandDto[]; meta: { total: number; page: number; limit: number } }> {
  const { data, meta } = await paginate<BrandRow>(prisma.brand, "Brand", buildListFilter(filters), {
    ...pagination,
    sort: pagination.sort ?? "slug",
  });
  return { data: await hydrate(data), meta };
}

/** Finds regardless of soft-delete state, so edit/restore can reach a deleted row. */
async function findAnyById(id: string): Promise<BrandRow> {
  const brand = await prisma.brand.findFirst({ where: { id, ...ANY_STATE } });
  if (!brand) throw new ApiError(404, NOT_FOUND);
  return brand;
}

async function findLiveById(id: string): Promise<BrandRow> {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new ApiError(404, NOT_FOUND);
  return brand;
}

export async function getAdminBrandById(id: string): Promise<AdminBrandDto> {
  return hydrateOne(await findAnyById(id));
}

export async function createBrand(input: CreateBrandInput): Promise<AdminBrandDto> {
  const { name, seo: seoInput, ...rest } = input;
  // Spelled out rather than spread through a Record<string, unknown> helper:
  // `create` is the one call whose required columns the compiler can actually
  // check, and widening the payload to unknown throws that away.
  return hydrateOne(
    await prisma.brand.create({
      data: { ...rest, ...toColumns(name), ...seoColumns(seoInput) },
    }),
  );
}

export async function updateBrand(id: string, input: UpdateBrandInput): Promise<AdminBrandDto> {
  await findLiveById(id);
  const { name, seo: seoInput, ...rest } = input;
  return hydrateOne(
    await prisma.brand.update({
      where: { id },
      data: { ...rest, ...(name ? toColumns(name) : {}), ...seoColumns(seoInput) },
    }),
  );
}

export async function deleteBrand(id: string): Promise<void> {
  await findLiveById(id);
  await assertBrandDeletable(id);
  await prisma.brand.update({ where: { id }, data: softDeleteData() });
}

export async function restoreBrand(id: string): Promise<AdminBrandDto> {
  await findAnyById(id);
  return hydrateOne(
    await prisma.brand.update({ where: { id, ...ANY_STATE }, data: { deletedAt: null } }),
  );
}
