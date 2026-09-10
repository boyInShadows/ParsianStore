import type { AccountType } from "@prisma/client";
import type { CatalogSystemCode, ProductDetailDto, ProductListItemDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { cursorPaginate, type CursorPageResult } from "../../utils/cursorPaginate.js";
import { paginate, type PaginatedResult } from "../../utils/pagination.js";
import { localized, systemCodeToWire } from "../../utils/serialize.js";
import {
  toProductDetail,
  toProductListItem,
  type ProductDetailAttribute,
  type ProductRow,
  type ProductWithVariants,
} from "./pricing.js";
import { buildProductFilter, type ProductFilterInput } from "./productFilter.js";
import type { ProductSortOption } from "./products.schema.js";

export type ListProductsFilters = ProductFilterInput;

const SORT_CONFIG: Record<
  ProductSortOption,
  { field: "createdAt" | "priceRial"; valueType: "date" | "number"; direction: 1 | -1 }
> = {
  newest: { field: "createdAt", valueType: "date", direction: -1 },
  "price-asc": { field: "priceRial", valueType: "number", direction: 1 },
  "price-desc": { field: "priceRial", valueType: "number", direction: -1 },
};

export async function listProducts(
  filters: ListProductsFilters,
  sort: ProductSortOption,
  cursor: string | undefined,
  limit: number,
  accountType: AccountType | undefined,
): Promise<CursorPageResult<ProductListItemDto>> {
  const where = await buildProductFilter(filters);
  const { field, valueType, direction } = SORT_CONFIG[sort];
  // No `select` narrowing the columns any more: Mongoose needed
  // `+wholesalePriceRial` to opt back into a `select: false` field, and Prisma
  // has no such concept -- every scalar comes back. Keeping the wholesale
  // price off the wire is now entirely pricing.ts's job, which is why that
  // mapper builds the DTO field by field instead of spreading the row.
  const { data, meta } = await cursorPaginate<ProductRow & { id: string }>(prisma.product, where, {
    sortField: field,
    valueType,
    direction,
    cursor,
    limit,
  });
  return { data: await withSystemCodes(data, accountType), meta };
}

/**
 * Attach each row's system, in ONE extra query for the whole page.
 *
 * The system code lives on `Category`, not on `Product`, and `cursorPaginate`
 * returns plain product rows with no relations. Resolving it per row would be
 * a textbook N+1; resolving the page's distinct category ids together is one
 * round trip regardless of page size.
 */
async function withSystemCodes(
  rows: ProductRow[],
  accountType: AccountType | undefined,
): Promise<ProductListItemDto[]> {
  const categoryIds = [...new Set(rows.map((row) => row.categoryId))];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, systemCode: true },
  });
  // `systemCodeToWire`, not the raw column: Prisma's enum members are `SYS_01`
  // (an identifier cannot hold a hyphen) mapped to `SYS-01` in the database,
  // and `SYS-01` is what every other wire shape in this app uses.
  const systemByCategory = new Map(
    categories.map((category) => [category.id, systemCodeToWire(category.systemCode)]),
  );
  return rows.map((row) =>
    toProductListItem(row, accountType, {
      systemCode: systemByCategory.get(row.categoryId) as CatalogSystemCode | undefined,
    }),
  );
}

async function findActiveBySlug(slug: string): Promise<ProductWithVariants> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "active" },
    include: { variants: { where: { deletedAt: null } } },
  });
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  return product;
}

export async function getProductBySlug(
  slug: string,
  accountType: AccountType | undefined,
): Promise<ProductListItemDto> {
  return toProductListItem(await findActiveBySlug(slug), accountType);
}

/**
 * The PDP (P5.S2) needs the brand and category names alongside the product,
 * and the Persian display label for each attribute key.
 *
 * Under Mongo this was the product query plus three more: brand by id,
 * category by id, and a batch lookup of Attribute rows to turn machine keys
 * ("color") into Persian labels ("رنگ"), because `Product.attributes[]` stored
 * only `{key, value}` and the label lived elsewhere. Postgres has real foreign
 * keys, so all of it is one query with `include` -- and the attribute label
 * arrives with the value rather than being reunited with it by hand.
 *
 * A soft-deleted brand or category still degrades to `null` rather than a 500.
 * Admin CRUD refuses to delete either while products point at them, so this is
 * a data-integrity edge case, and a PDP that renders without a brand label
 * beats one that crashes.
 *
 * The relation filters spell out `deletedAt: null` because the soft-delete
 * extension does not reach nested reads -- the documented gap in
 * config/prisma.ts, and the one place in this module it matters.
 */
export async function getProductDetailBySlug(
  slug: string,
  accountType: AccountType | undefined,
): Promise<ProductDetailDto> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "active" },
    include: {
      variants: { where: { deletedAt: null } },
      brand: true,
      category: true,
      attributes: { include: { attribute: true } },
    },
  });
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }

  const attributes: ProductDetailAttribute[] = product.attributes.map((row) => ({
    key: row.attribute.key,
    keyLabel: row.attribute.name,
    ...(row.attribute.unit ? { unit: row.attribute.unit } : {}),
    value: row.value,
  }));

  return toProductDetail(
    product,
    {
      brand:
        product.brand.deletedAt === null
          ? {
              id: product.brand.id,
              name: localized(product.brand),
              slug: product.brand.slug,
            }
          : null,
      category:
        product.category.deletedAt === null
          ? {
              id: product.category.id,
              name: localized(product.category),
              slug: product.category.slug,
              path: product.category.path,
            }
          : null,
      attributes,
    },
    accountType,
  );
}

/** Same category, excluding the product itself — a small bounded widget,
 * not the scrollable listing cursorPaginate exists for, so plain
 * page/limit pagination (utils/pagination.ts) is the right tool here. */
export async function getRelatedProducts(
  slug: string,
  limit: number,
  accountType: AccountType | undefined,
): Promise<PaginatedResult<ProductListItemDto>> {
  const product = await findActiveBySlug(slug);
  const { data, meta } = await paginate<ProductRow>(
    prisma.product,
    "Product",
    { categoryId: product.categoryId, status: "active", id: { not: product.id } },
    { page: 1, limit },
  );
  return { data: await withSystemCodes(data, accountType), meta };
}
