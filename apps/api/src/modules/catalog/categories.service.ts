import { CategoryModel, type Category } from "../../models/Category.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema.js";

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

/** Root-first ancestor slugs, self excluded — see Category.path's doc comment. */
async function resolvePath(parentId: string | undefined): Promise<string[]> {
  if (!parentId) return [];
  const parent = await CategoryModel.findById(parentId);
  if (!parent) {
    throw new ApiError(400, "دسته‌بندی والد یافت نشد");
  }
  return [...parent.path, parent.slug];
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<HydratedDocument<Category>> {
  const path = await resolvePath(input.parentId);
  return CategoryModel.create({ ...input, path });
}

/**
 * Recomputes this category's own `path` when its parent changes. Does NOT
 * cascade the new path down to existing descendants — out of scope for
 * this step's admin CRUD (P3.S1); re-parenting a category with children
 * would need a background job walking the subtree, not a synchronous
 * request handler.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<HydratedDocument<Category>> {
  const category = await CategoryModel.findById(id);
  if (!category) {
    throw new ApiError(404, "دسته‌بندی یافت نشد");
  }

  const path = "parentId" in input ? await resolvePath(input.parentId) : category.path;
  Object.assign(category, input, { path });
  await category.save();
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await CategoryModel.findById(id);
  if (!category) {
    throw new ApiError(404, "دسته‌بندی یافت نشد");
  }
  await category.softDelete();
}
