import { Types, type FilterQuery, type Model } from "mongoose";
import { normalizeFa } from "schemas";
import { AttributeModel } from "../../models/Attribute.js";
import { BrandModel, type Brand } from "../../models/Brand.js";
import { CategoryModel, type Category } from "../../models/Category.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { buildProductFilter } from "../../modules/catalog/productFilter.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";
import type {
  AttributeFacetBucket,
  FacetBucket,
  ProductFacets,
  ProductSearchFilters,
  SearchProvider,
} from "./SearchProvider.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// searchProducts (free-text search) only ever filters by vehicle today —
// buildProductFilter's other fields (category/brand/price/attributes/
// inStock) are facets-only (getFacets below), not yet exposed on the
// search endpoint's own query schema.
async function baseFilter(filters: ProductSearchFilters): Promise<FilterQuery<Product>> {
  return buildProductFilter(filters);
}

/**
 * Three independent matching techniques (§9/P3.S4), unioned by product id
 * rather than combined in one query: MongoDB's `$text` operator can only
 * appear at a query's top level, never inside `$or` — running each as its
 * own top-level query and merging the id sets is what makes `$text` (for
 * genuine multi-word "match ترمز OR جلو" relevance) and a plain substring
 * `$regex` (for "prefix"/partial-word queries `$text` can't do — it
 * doesn't do word-fragment matching even with stemming disabled) coexist.
 * Relevance ranking is intentionally not attempted here — an honest MVP
 * for `SEARCH_DRIVER=mongo` (.env.example already anticipates swapping to
 * Meilisearch later without this interface changing).
 */
async function matchingProductIds(
  filter: FilterQuery<Product>,
  rawQuery: string,
): Promise<Types.ObjectId[] | null> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;

  const normalized = normalizeFa(trimmed);
  const escapedTrimmed = escapeRegExp(trimmed);
  const escapedNormalized = escapeRegExp(normalized);

  const [textMatches, prefixMatches, oemMatches] = await Promise.all([
    ProductModel.find({ ...filter, $text: { $search: normalized } }).select("_id"),
    ProductModel.find({
      ...filter,
      searchText: { $regex: escapedNormalized, $options: "i" },
    }).select("_id"),
    ProductModel.find({
      ...filter,
      oemNumbers: { $regex: `^${escapedTrimmed}$`, $options: "i" },
    }).select("_id"),
  ]);

  const ids = new Map<string, Types.ObjectId>();
  for (const doc of [...textMatches, ...prefixMatches, ...oemMatches]) {
    ids.set(doc._id.toString(), doc._id);
  }
  return [...ids.values()];
}

async function hydrateFacetBuckets<T extends { name: Category["name"]; slug: string }>(
  model: Model<T>,
  buckets: { _id: Types.ObjectId; count: number }[],
): Promise<FacetBucket[]> {
  const docs = await model.find({ _id: { $in: buckets.map((b) => b._id) } });
  const countById = new Map(buckets.map((b) => [b._id.toString(), b.count]));
  return docs.map((doc) => ({
    id: doc.id as string,
    name: doc.name,
    slug: doc.slug,
    count: countById.get(doc.id as string) ?? 0,
  }));
}

interface CountBucket {
  _id: Types.ObjectId;
  count: number;
}

interface StockCountBucket {
  _id: boolean;
  count: number;
}

interface AttributeCountBucket {
  _id: { key: string; value: string };
  count: number;
}

async function hydrateAttributeBuckets(
  buckets: AttributeCountBucket[],
): Promise<AttributeFacetBucket[]> {
  const keys = [...new Set(buckets.map((b) => b._id.key))];
  const attributeDocs = await AttributeModel.find({ key: { $in: keys } });
  const labelByKey = new Map(attributeDocs.map((doc) => [doc.key, doc.name]));
  return buckets.map((bucket) => ({
    key: bucket._id.key,
    keyLabel: labelByKey.get(bucket._id.key) ?? bucket._id.key,
    value: bucket._id.value,
    count: bucket.count,
  }));
}

export class MongoSearchProvider implements SearchProvider {
  async searchProducts(
    query: string,
    filters: ProductSearchFilters,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<HydratedDocument<Product>>> {
    const filter = await baseFilter(filters);
    const matchedIds = await matchingProductIds(filter, query);

    // P6.S1: selected here so search.controller.ts can resolve each
    // viewer's effective price via modules/catalog/pricing.ts, same as
    // every other product-list read path.
    const priceSelect = { select: "+wholesalePriceRial" };
    if (matchedIds === null) {
      return paginate(ProductModel, filter, pagination, priceSelect);
    }
    if (matchedIds.length === 0) {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
    return paginate(ProductModel, { _id: { $in: matchedIds } }, pagination, priceSelect);
  }

  // Each dimension's bucket counts are computed against every filter
  // EXCEPT that dimension's own current selection ("OR-facet" pattern) --
  // otherwise, picking a brand would collapse every other brand's count to
  // zero (its own filter would already exclude them), which defeats the
  // point of showing "how many if you picked this option instead." Every
  // other active filter (category, price, vehicle, ...) still applies.
  async getFacets(filters: ProductSearchFilters): Promise<ProductFacets> {
    const [categoryFilter, brandFilter, stockFilter, attributesFilter] = await Promise.all([
      buildProductFilter({ ...filters, category: undefined }),
      buildProductFilter({ ...filters, brand: undefined }),
      buildProductFilter({ ...filters, inStock: undefined }),
      buildProductFilter({ ...filters, attributes: undefined }),
    ]);

    const [categoryBuckets, brandBuckets, stockBuckets, attributeBuckets] = await Promise.all([
      ProductModel.aggregate<CountBucket>([
        { $match: categoryFilter },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      ]),
      ProductModel.aggregate<CountBucket>([
        { $match: brandFilter },
        { $group: { _id: "$brandId", count: { $sum: 1 } } },
      ]),
      ProductModel.aggregate<StockCountBucket>([
        { $match: stockFilter },
        { $group: { _id: { $gt: ["$stock", 0] }, count: { $sum: 1 } } },
      ]),
      ProductModel.aggregate<AttributeCountBucket>([
        { $match: attributesFilter },
        { $unwind: "$attributes" },
        {
          $group: {
            _id: { key: "$attributes.key", value: "$attributes.value" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const [categories, brands, attributes] = await Promise.all([
      hydrateFacetBuckets<Category>(CategoryModel, categoryBuckets),
      hydrateFacetBuckets<Brand>(BrandModel, brandBuckets),
      hydrateAttributeBuckets(attributeBuckets),
    ]);

    return {
      categories,
      brands,
      stock: stockBuckets.map((bucket) => ({ inStock: bucket._id, count: bucket.count })),
      attributes,
    };
  }
}
