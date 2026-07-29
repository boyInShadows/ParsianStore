import type { HydratedDocument } from "mongoose";
import { ProductModel, type Product } from "../../models/Product.js";
import { WishlistModel, type Wishlist } from "../../models/Wishlist.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationMeta, type PaginationQuery } from "../../utils/pagination.js";

export interface WishlistEntry {
  id: string;
  productId: string;
  createdAt: Date;
  product: HydratedDocument<Product>;
}

/** Idempotent by design (§9's own wishlist entry has no add-twice error
 * case to guard against) -- `upsert: true` plus the model's own unique
 * `{userId, productId}` index means a repeat add is a harmless no-op, not
 * a 409. Throws 404 if the product doesn't exist (or is soft-deleted --
 * `ProductModel.findById` already excludes those via the base plugin's
 * pre-find hook). */
export async function addToWishlist(
  userId: string,
  productId: string,
): Promise<HydratedDocument<Wishlist>> {
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  const entry = await WishlistModel.findOneAndUpdate(
    { userId, productId },
    { $setOnInsert: { userId, productId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return entry;
}

/** Idempotent -- removing a product that was never saved (or already
 * removed) is a success, matching standard REST DELETE semantics, not a
 * 404. A real `deleteOne()`, not `.softDelete()`: a user unsaving a
 * product has no reason to keep a trash record around. */
export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await WishlistModel.deleteOne({ userId, productId });
}

/** Separate-query hydration (not `.populate()`) -- the established
 * pattern across this codebase (see products.service.ts's
 * getProductDetailBySlug, fitment.service.ts). `meta.total` reflects the
 * underlying wishlist-entry count from `paginate()`, independent of
 * hydration -- entries whose product no longer resolves (soft-deleted
 * after being saved, a rare edge case) are silently dropped from `data`
 * rather than surfaced as a broken row, so the returned array can be
 * shorter than `meta.total` implies in that one edge case. */
export async function listWishlist(
  userId: string,
  pagination: PaginationQuery,
): Promise<{ data: WishlistEntry[]; meta: PaginationMeta }> {
  const { data: entries, meta } = await paginate(
    WishlistModel,
    { userId },
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
  );

  if (entries.length === 0) {
    return { data: [], meta };
  }

  const productIds = entries.map((entry) => entry.productId);
  const products = await ProductModel.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((product) => [product._id.toString(), product]));

  const data = entries.flatMap((entry): WishlistEntry[] => {
    const product = productById.get(entry.productId.toString());
    if (!product) {
      return [];
    }
    return [
      {
        id: entry._id.toString(),
        productId: entry.productId.toString(),
        createdAt: entry.createdAt,
        product,
      },
    ];
  });

  return { data, meta };
}
