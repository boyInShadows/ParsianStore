import type { AccountType } from "@prisma/client";
import type { ProductListItemDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginatableDelegate,
  type PaginationMeta,
  type PaginationQuery,
} from "../../utils/pagination.js";
import { toProductListItem, type ProductRow } from "../catalog/pricing.js";

export interface WishlistEntry {
  id: string;
  productId: string;
  createdAt: Date;
  product: ProductListItemDto;
}

/** Idempotent by design (§9's own wishlist entry has no add-twice error
 * case to guard against) -- an upsert on the `{userId, productId}` unique
 * means a repeat add is a harmless no-op, not a 409. Throws 404 if the
 * product does not exist or is soft-deleted, the latter handled by the
 * soft-delete extension rather than by anything written here. */
export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  await prisma.wishlist.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });
}

/** Idempotent -- removing a product that was never saved (or already
 * removed) is a success, matching standard REST DELETE semantics, not a
 * 404. A real delete, not a soft one: a user unsaving a product has no
 * reason to keep a trash record around. */
export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await prisma.wishlist.deleteMany({ where: { userId, productId } });
}

interface WishlistRow {
  id: string;
  productId: string;
  createdAt: Date;
  product: ProductRow & { deletedAt: Date | null };
}

/**
 * The product arrives joined rather than through a second batched lookup.
 *
 * `meta.total` still reflects the underlying wishlist-entry count from
 * `paginate()`, independent of hydration -- an entry whose product was
 * soft-deleted after being saved is dropped from `data` rather than
 * surfaced as a broken row, so the returned array can be shorter than
 * `meta.total` implies in that one edge case. The `deletedAt` check is
 * explicit because the extension does not reach nested reads.
 *
 * `accountType` is a parameter now: the controller used to shape the raw
 * product itself, which meant a service returned rows carrying
 * `wholesalePriceRial` and only the layer above kept it off the wire.
 */
export async function listWishlist(
  userId: string,
  pagination: PaginationQuery,
  accountType: AccountType | undefined,
): Promise<{ data: WishlistEntry[]; meta: PaginationMeta }> {
  const { data: entries, meta } = await paginate<WishlistRow>(
    prisma.wishlist as unknown as PaginatableDelegate<WishlistRow>,
    "Wishlist",
    { userId },
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
    { include: { product: true } },
  );

  const data = entries.flatMap((entry): WishlistEntry[] => {
    if (entry.product.deletedAt !== null) return [];
    return [
      {
        id: entry.id,
        productId: entry.productId,
        createdAt: entry.createdAt,
        product: toProductListItem(entry.product, accountType),
      },
    ];
  });

  return { data, meta };
}
