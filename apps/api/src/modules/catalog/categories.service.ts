import type { CategoryDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { localized } from "../../utils/serialize.js";

// Shopper reads only. Every write (plus the admin-shaped reads, the delete
// guards, and restore) lives in categories.admin.service.ts as of P8.S4 —
// the same module split products.admin.* has had since P8.S2. Keeping the
// guards out of here also keeps the Product table out of the shopper read path.

export interface CategoryRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  parentId: string | null;
  path: string[];
}

export function toCategoryDto(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    name: localized(row),
    slug: row.slug,
    parentId: row.parentId,
    path: row.path,
  };
}

export async function listCategories(
  parentId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<CategoryDto>> {
  const { data, meta } = await paginate<CategoryRow>(
    prisma.category,
    "Category",
    parentId ? { parentId } : {},
    pagination,
  );
  return { data: data.map(toCategoryDto), meta };
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDto> {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) {
    throw new ApiError(404, "دسته‌بندی یافت نشد");
  }
  return toCategoryDto(category);
}
