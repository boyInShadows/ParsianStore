import type { FilterQuery, HydratedDocument } from "mongoose";
import type { AdminBrandDto } from "schemas";
import { BrandModel, type Brand } from "../../models/Brand.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery } from "../../utils/pagination.js";
import { escapeRegExp } from "../../utils/regex.js";
import { assertBrandDeletable, countProductsByBrand } from "./catalogUsage.js";
import type {
  AdminBrandListQuery,
  CreateBrandInput,
  UpdateBrandInput,
} from "./brands.admin.schema.js";

const NOT_FOUND = "برند یافت نشد";

/** See categories.admin.service.ts for why this shape, not `$in: [null, ...]`. */
const ANY_STATE = { deletedAt: { $exists: true } } as const;

type ListFilters = Omit<AdminBrandListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): FilterQuery<Brand> {
  const filter: FilterQuery<Brand> =
    filters.state === "deleted" ? { deletedAt: { $ne: null } } : { deletedAt: null };

  if (filters.isOEM) filter.isOEM = filters.isOEM === "true";
  if (filters.q) {
    const escaped = escapeRegExp(filters.q);
    filter.$or = [
      { "name.fa": { $regex: escaped } },
      { "name.en": { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
    ];
  }
  return filter;
}

function toDto(doc: HydratedDocument<Brand>, productCount: number): AdminBrandDto {
  return {
    id: String(doc._id),
    name: { fa: doc.name.fa, en: doc.name.en },
    slug: doc.slug,
    logo: doc.logo,
    country: doc.country,
    isOEM: doc.isOEM,
    description: doc.description,
    seo: doc.seo,
    productCount,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  };
}

async function hydrate(docs: HydratedDocument<Brand>[]): Promise<AdminBrandDto[]> {
  const counts = await countProductsByBrand(docs.map((doc) => String(doc._id)));
  return docs.map((doc) => toDto(doc, counts.get(String(doc._id)) ?? 0));
}

async function hydrateOne(doc: HydratedDocument<Brand>): Promise<AdminBrandDto> {
  const [dto] = await hydrate([doc]);
  if (!dto) throw new ApiError(404, NOT_FOUND);
  return dto;
}

export async function listAdminBrands(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminBrandDto[]; meta: { total: number; page: number; limit: number } }> {
  const { data, meta } = await paginate(BrandModel, buildListFilter(filters), {
    ...pagination,
    sort: pagination.sort ?? "slug",
  });
  return { data: await hydrate(data), meta };
}

/** Finds regardless of soft-delete state, so edit/restore can reach a deleted row. */
async function findAnyById(id: string): Promise<HydratedDocument<Brand>> {
  const brand = await BrandModel.findOne({ _id: id, ...ANY_STATE });
  if (!brand) throw new ApiError(404, NOT_FOUND);
  return brand;
}

export async function getAdminBrandById(id: string): Promise<AdminBrandDto> {
  return hydrateOne(await findAnyById(id));
}

export async function createBrand(input: CreateBrandInput): Promise<AdminBrandDto> {
  return hydrateOne(await BrandModel.create(input));
}

export async function updateBrand(id: string, input: UpdateBrandInput): Promise<AdminBrandDto> {
  const brand = await BrandModel.findById(id);
  if (!brand) throw new ApiError(404, NOT_FOUND);
  Object.assign(brand, input);
  await brand.save();
  return hydrateOne(brand);
}

export async function deleteBrand(id: string): Promise<void> {
  const brand = await BrandModel.findById(id);
  if (!brand) throw new ApiError(404, NOT_FOUND);
  await assertBrandDeletable(id);
  await brand.softDelete();
}

export async function restoreBrand(id: string): Promise<AdminBrandDto> {
  const brand = await findAnyById(id);
  brand.deletedAt = null;
  await brand.save();
  return hydrateOne(brand);
}
