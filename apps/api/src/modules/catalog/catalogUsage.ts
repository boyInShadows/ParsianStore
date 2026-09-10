import { toPersianDigits } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * P8.S4. Referential-usage counting for the catalog taxonomy, in one place.
 *
 * Until this step nothing in the codebase ever asked "is this brand/category/
 * attribute still in use?" — the three admin delete endpoints (shipped
 * P3.S1) soft-deleted unconditionally, even though products.service.ts's own
 * comment already claimed "admin CRUD guards deletion of a category/brand
 * still in use". It did not. That was invisible only because no UI had ever
 * exposed a delete button; P8.S4 shipped three of them.
 *
 * The two Mongoose caveats this file used to carry are gone. `aggregate` was
 * never covered by the soft-delete plugin so every `$match` restated
 * `deletedAt: null`; Prisma's `groupBy` and `count` *are* covered by the client
 * extension, so the filter is stated exactly once, centrally. The one place it
 * still appears by hand is inside a relation filter -- extensions do not reach
 * nested reads, which is the documented gap in config/prisma.ts.
 *
 * "In use" counts every live product regardless of `status` — an archived
 * product still stores the id, and archiving is reversible (P8.S2), so
 * letting a brand be deleted out from under one would leave a dangling
 * reference the moment staff un-archived it.
 */

function tally(rows: { key: string; _count: number }[]): Map<string, number> {
  return new Map(rows.map((row) => [row.key, row._count]));
}

/** productCount per brand id, for the current page of the admin brands list. */
export async function countProductsByBrand(brandIds: string[]): Promise<Map<string, number>> {
  if (brandIds.length === 0) return new Map();
  const rows = await prisma.product.groupBy({
    by: ["brandId"],
    where: { brandId: { in: brandIds } },
    _count: true,
  });
  return tally(rows.map((row) => ({ key: row.brandId, _count: row._count })));
}

/** productCount per category id, for the current page of the admin list. */
export async function countProductsByCategory(categoryIds: string[]): Promise<Map<string, number>> {
  if (categoryIds.length === 0) return new Map();
  const rows = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { categoryId: { in: categoryIds } },
    _count: true,
  });
  return tally(rows.map((row) => ({ key: row.categoryId, _count: row._count })));
}

/** Direct-children count per category id — a category with children cannot be deleted. */
export async function countChildCategories(parentIds: string[]): Promise<Map<string, number>> {
  if (parentIds.length === 0) return new Map();
  const rows = await prisma.category.groupBy({
    by: ["parentId"],
    where: { parentId: { in: parentIds } },
    _count: true,
  });
  return tally(
    rows
      .filter((row): row is typeof row & { parentId: string } => row.parentId !== null)
      .map((row) => ({ key: row.parentId, _count: row._count })),
  );
}

/**
 * usageCount per attribute key.
 *
 * This is the one counter the migration genuinely changed. Under Mongo,
 * `Product.attributes[]` was an inline sub-document array holding the
 * attribute *key* as a plain string, so the count meant unwinding that array
 * and matching strings. `ProductAttributeValue` is now a real table with a
 * foreign key to `Attribute`, so the same question is a join.
 *
 * `product: { deletedAt: null }` is written out because it is a relation
 * filter, and the soft-delete extension does not reach nested reads. Without
 * it a soft-deleted product would still count as "using" the attribute and
 * would block a legitimate delete.
 */
export async function countProductsByAttributeKey(keys: string[]): Promise<Map<string, number>> {
  if (keys.length === 0) return new Map();
  const rows = await prisma.productAttributeValue.groupBy({
    by: ["attributeId"],
    where: { attribute: { key: { in: keys } }, product: { deletedAt: null } },
    _count: true,
  });
  if (rows.length === 0) return new Map();
  const attributes = await prisma.attribute.findMany({
    where: { id: { in: rows.map((row) => row.attributeId) } },
    select: { id: true, key: true },
  });
  const keyById = new Map(attributes.map((a) => [a.id, a.key]));
  return tally(
    rows
      .filter((row) => keyById.has(row.attributeId))
      .map((row) => ({ key: keyById.get(row.attributeId)!, _count: row._count })),
  );
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

/**
 * Both branches are kept, but only one is still load-bearing.
 *
 * The `rename` guard existed because a product stored the attribute *key* as a
 * plain string: renaming the key silently degraded the PDP specs table and PLP
 * facets to the raw machine key. With `ProductAttributeValue.attributeId` as a
 * foreign key, a rename no longer breaks anything and this guard now blocks a
 * safe operation. Left in place because relaxing it is a product decision about
 * what staff are allowed to do, not a consequence of changing databases -- but
 * it is the first thing to drop if the admin panel ever needs renames.
 */
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
