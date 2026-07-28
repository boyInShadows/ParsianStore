import type { HydratedDocument } from "mongoose";
import { ProductModel, type Product } from "../../models/Product.js";
import { ApiError } from "../../utils/ApiError.js";
import { cursorPaginate, type CursorPageResult } from "../../utils/cursorPaginate.js";
import { paginate, type PaginatedResult } from "../../utils/pagination.js";
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
): Promise<CursorPageResult<HydratedDocument<Product>>> {
  const filter = await buildProductFilter(filters);

  const { field, valueType, direction } = SORT_CONFIG[sort];
  return cursorPaginate(ProductModel, filter, {
    sortField: field,
    valueType,
    direction,
    cursor,
    limit,
  });
}

export async function getProductBySlug(slug: string): Promise<HydratedDocument<Product>> {
  const product = await ProductModel.findOne({ slug, status: "active" });
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  return product;
}

/** Same category, excluding the product itself — a small bounded widget,
 * not the scrollable listing cursorPaginate exists for, so plain
 * page/limit pagination (utils/pagination.ts) is the right tool here. */
export async function getRelatedProducts(
  slug: string,
  limit: number,
): Promise<PaginatedResult<HydratedDocument<Product>>> {
  const product = await getProductBySlug(slug);
  return paginate(
    ProductModel,
    { categoryId: product.categoryId, status: "active", _id: { $ne: product._id } },
    { page: 1, limit },
  );
}
