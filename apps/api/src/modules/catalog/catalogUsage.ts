import { Types } from "mongoose";
import { toPersianDigits } from "schemas";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * P8.S4. Referential-usage counting for the catalog taxonomy, in one place.
 *
 * Until this step nothing in the codebase ever asked "is this brand/category/
 * attribute still in use?" — the three admin delete endpoints (shipped
 * P3.S1) soft-deleted unconditionally, even though products.service.ts's own
 * comment already claimed "admin CRUD guards deletion of a category/brand
 * still in use". It did not. That was invisible only because no UI had ever
 * exposed a delete button; this step ships three of them.
 *
 * Two Mongoose behaviours this file exists to get right exactly once:
 *
 * 1. `aggregate` is never covered by query middleware, so the soft-delete
 *    plugin does NOT filter these pipelines — every `$match` states
 *    `deletedAt: null` for itself.
 * 2. `countDocuments` IS covered as of P8.S4 (see models/plugins.ts), but
 *    the filters below still say `deletedAt: null` explicitly: it is
 *    self-documenting next to the pipelines and behaves identically.
 *
 * "In use" counts every live product regardless of `status` — an archived
 * product still stores the id, and archiving is reversible (P8.S2), so
 * letting a brand be deleted out from under one would leave a dangling
 * reference the moment staff un-archived it.
 */

async function countByField(
  field: "brandId" | "categoryId",
  ids: string[],
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await ProductModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        [field]: { $in: ids.map((id) => new Types.ObjectId(id)) },
        deletedAt: null,
      },
    },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

/** productCount per brand id, for the current page of the admin brands list. */
export function countProductsByBrand(brandIds: string[]): Promise<Map<string, number>> {
  return countByField("brandId", brandIds);
}

/** productCount per category id, for the current page of the admin list. */
export function countProductsByCategory(categoryIds: string[]): Promise<Map<string, number>> {
  return countByField("categoryId", categoryIds);
}

/** Direct-children count per category id — a category with children cannot be deleted. */
export async function countChildCategories(parentIds: string[]): Promise<Map<string, number>> {
  if (parentIds.length === 0) return new Map();
  const rows = await CategoryModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        parentId: { $in: parentIds.map((id) => new Types.ObjectId(id)) },
        deletedAt: null,
      },
    },
    { $group: { _id: "$parentId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

/**
 * usageCount per attribute key. `Product.attributes[].key` is a plain string,
 * not a ref (P3.S2) — deleting or renaming a key silently degrades the PDP
 * specs table and PLP facets to the raw machine key ("color" instead of
 * "رنگ"), which is exactly the failure this counting prevents.
 */
export async function countProductsByAttributeKey(keys: string[]): Promise<Map<string, number>> {
  if (keys.length === 0) return new Map();
  const rows = await ProductModel.aggregate<{ _id: string; count: number }>([
    { $match: { "attributes.key": { $in: keys }, deletedAt: null } },
    { $unwind: "$attributes" },
    { $match: { "attributes.key": { $in: keys } } },
    { $group: { _id: "$attributes.key", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}

// 409, not 400: this is a genuine state conflict (the resource exists and the
// request is well-formed — it is the world that says no), matching how
// checkout.service.ts and inventory.service.ts already use 409.
const CONFLICT = 409;

export async function assertBrandDeletable(brandId: string): Promise<void> {
  const count = (await countProductsByBrand([brandId])).get(brandId) ?? 0;
  if (count > 0) {
    throw new ApiError(
      CONFLICT,
      `${toPersianDigits(count)} محصول به این برند متصل است؛ ابتدا آن‌ها را به برند دیگری منتقل کنید`,
    );
  }
}

export async function assertCategoryDeletable(categoryId: string): Promise<void> {
  const children = (await countChildCategories([categoryId])).get(categoryId) ?? 0;
  if (children > 0) {
    throw new ApiError(
      CONFLICT,
      `${toPersianDigits(children)} زیرمجموعه زیر این دسته‌بندی قرار دارد؛ ابتدا آن‌ها را جابه‌جا کنید`,
    );
  }
  const products = (await countProductsByCategory([categoryId])).get(categoryId) ?? 0;
  if (products > 0) {
    throw new ApiError(
      CONFLICT,
      `${toPersianDigits(products)} محصول در این دسته‌بندی قرار دارد؛ ابتدا آن‌ها را جابه‌جا کنید`,
    );
  }
}

export async function assertAttributeKeyUnused(
  key: string,
  action: "delete" | "rename",
): Promise<void> {
  const count = (await countProductsByAttributeKey([key])).get(key) ?? 0;
  if (count > 0) {
    const verb = action === "delete" ? "حذف" : "تغییر کلید";
    throw new ApiError(
      CONFLICT,
      `${toPersianDigits(count)} محصول از این ویژگی استفاده می‌کند؛ ${verb} ممکن نیست`,
    );
  }
}
