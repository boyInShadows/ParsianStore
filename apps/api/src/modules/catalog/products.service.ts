import type { HydratedDocument } from "mongoose";
import { AttributeModel } from "../../models/Attribute.js";
import { BrandModel, type Brand } from "../../models/Brand.js";
import { CategoryModel, type Category } from "../../models/Category.js";
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

export interface ProductDetailAttribute {
  key: string;
  keyLabel: string;
  unit?: string;
  value: string;
}

export interface ProductDetail {
  product: HydratedDocument<Product>;
  brand: HydratedDocument<Brand> | null;
  category: HydratedDocument<Category> | null;
  attributes: ProductDetailAttribute[];
}

// The PDP (P5.S2) needs the brand name/slug and category name/slug/path
// to render, but Product only stores brandId/categoryId, and neither
// brands nor categories has a public by-id lookup (only by-slug) -- no
// existing mechanism resolves a single arbitrary product's brand/category
// names. Two extra by-id queries, same "separate query, not populate"
// pattern as getFittingProductIds/hydrateFacetBuckets elsewhere in this
// module. A soft-deleted or missing brand/category (shouldn't happen in
// practice, admin CRUD guards deletion of a category/brand still in use)
// degrades to null rather than a 500 -- the PDP can still render without
// a brand/category label rather than crash over a data-integrity edge case.
//
// `product.attributes` is only {key,value} pairs -- `key` is an internal
// machine key ("color"), never the Persian display label ("رنگ", per
// Attribute.ts's own doc comment) -- same gap P5.S1 already hit and fixed
// for facets (MongoSearchProvider's hydrateAttributeBuckets), resolved the
// same way here: one batch lookup against the Attribute model.
export async function getProductDetailBySlug(slug: string): Promise<ProductDetail> {
  const product = await getProductBySlug(slug);
  const [brand, category, attributeDocs] = await Promise.all([
    BrandModel.findById(product.brandId),
    CategoryModel.findById(product.categoryId),
    AttributeModel.find({ key: { $in: product.attributes.map((a) => a.key) } }),
  ]);
  const attributeMeta = new Map(attributeDocs.map((doc) => [doc.key, doc]));
  const attributes = product.attributes.map((attribute) => {
    const meta = attributeMeta.get(attribute.key);
    return {
      key: attribute.key,
      keyLabel: meta?.name ?? attribute.key,
      unit: meta?.unit,
      value: attribute.value,
    };
  });
  return { product, brand, category, attributes };
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
