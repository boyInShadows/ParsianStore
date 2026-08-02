import { CategoryModel, type Category } from "../../models/Category.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";

// Shopper reads only. Every write (plus the admin-shaped reads, the delete
// guards, and restore) lives in categories.admin.service.ts as of P8.S4 —
// the same module split products.admin.* has had since P8.S2. Keeping the
// guards out of here also keeps ProductModel out of the shopper read path.

export function listCategories(
  parentId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<Category>>> {
  return paginate(CategoryModel, parentId ? { parentId } : {}, pagination);
}

export async function getCategoryBySlug(slug: string): Promise<HydratedDocument<Category>> {
  const category = await CategoryModel.findOne({ slug });
  if (!category) {
    throw new ApiError(404, "دسته‌بندی یافت نشد");
  }
  return category;
}
