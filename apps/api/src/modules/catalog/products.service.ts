import type { FilterQuery, HydratedDocument } from "mongoose";
import type { VehicleKeyParts } from "schemas";
import { getFittingProductIds } from "../fitment/fitment.service.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { ApiError } from "../../utils/ApiError.js";
import { cursorPaginate, type CursorPageResult } from "../../utils/cursorPaginate.js";
import { paginate, type PaginatedResult } from "../../utils/pagination.js";
import type { ProductSortOption } from "./products.schema.js";

export interface ListProductsFilters {
  category?: string;
  brand?: string;
  vehicle?: VehicleKeyParts;
  minPriceRial?: number;
  maxPriceRial?: number;
  attributes?: string;
  inStock?: boolean;
}

const SORT_CONFIG: Record<
  ProductSortOption,
  { field: "createdAt" | "priceRial"; valueType: "date" | "number"; direction: 1 | -1 }
> = {
  newest: { field: "createdAt", valueType: "date", direction: -1 },
  "price-asc": { field: "priceRial", valueType: "number", direction: 1 },
  "price-desc": { field: "priceRial", valueType: "number", direction: -1 },
};

/** "color:red,size:large" -> [["color","red"], ["size","large"]] — the
 * shape itself is already Zod-validated (products.schema.ts); this just
 * splits it into pairs the caller turns into $elemMatch conditions. */
function parseAttributesParam(raw: string): [string, string][] {
  return raw.split(",").map((pair) => {
    const [key, value] = pair.split(":") as [string, string];
    return [key, value];
  });
}

function emptyPage(limit: number): CursorPageResult<HydratedDocument<Product>> {
  return { data: [], meta: { nextCursor: null, limit } };
}

export async function listProducts(
  filters: ListProductsFilters,
  sort: ProductSortOption,
  cursor: string | undefined,
  limit: number,
): Promise<CursorPageResult<HydratedDocument<Product>>> {
  const filter: FilterQuery<Product> = { status: "active" };

  if (filters.category) {
    const category = await CategoryModel.findOne({ slug: filters.category });
    if (!category) return emptyPage(limit);
    filter.categoryId = category._id;
  }

  if (filters.brand) {
    const brand = await BrandModel.findOne({ slug: filters.brand });
    if (!brand) return emptyPage(limit);
    filter.brandId = brand._id;
  }

  if (filters.vehicle) {
    const productIds = await getFittingProductIds(filters.vehicle);
    if (productIds.length === 0) return emptyPage(limit);
    filter._id = { $in: productIds };
  }

  if (filters.minPriceRial !== undefined || filters.maxPriceRial !== undefined) {
    filter.priceRial = {};
    if (filters.minPriceRial !== undefined) filter.priceRial.$gte = filters.minPriceRial;
    if (filters.maxPriceRial !== undefined) filter.priceRial.$lte = filters.maxPriceRial;
  }

  if (filters.inStock) {
    filter.stock = { $gt: 0 };
  }

  if (filters.attributes) {
    filter.$and = parseAttributesParam(filters.attributes).map(([key, value]) => ({
      attributes: { $elemMatch: { key, value } },
    }));
  }

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
