import type { AccountType } from "@prisma/client";
import { normalizeFa, type ProductListItemDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { toProductListItem, type ProductRow } from "../../modules/catalog/pricing.js";
import { buildProductFilter } from "../../modules/catalog/productFilter.js";
import {
  paginate,
  type PaginatedResult,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import { localized } from "../../utils/serialize.js";
import type {
  AttributeFacetBucket,
  FacetBucket,
  ProductFacets,
  ProductSearchFilters,
  SearchProvider,
} from "./SearchProvider.js";

// searchProducts (free-text search) only ever filters by vehicle today —
// buildProductFilter's other fields (category/brand/price/attributes/
// inStock) are facets-only (getFacets below), not yet exposed on the
// search endpoint's own query schema.
function baseFilter(filters: ProductSearchFilters): Promise<Where> {
  return buildProductFilter(filters);
}

/**
 * Three independent matching techniques, unioned by product id.
 *
 * The union is not an accident of the old database. Under Mongo it was forced
 * -- `$text` may only appear at a query's top level, never inside `$or` --
 * and Postgres has no such restriction, so this could have been one `OR`.
 * It stays three queries because they are genuinely different questions:
 *
 * 1. **Full text**, against the generated `searchVector`. `plainto_tsquery`
 *    rather than `to_tsquery` because the input is a shopper's raw phrase, not
 *    a query language -- `to_tsquery` would throw a syntax error on a stray
 *    `&` or a bare apostrophe, turning a typo into a 500.
 * 2. **Substring**, which full text cannot do at all: a tsvector matches whole
 *    lexemes, so "ترم" finds nothing even with stemming off. A substring
 *    match handles the partial-word and prefix queries a shopper actually types.
 * 3. **Exact OEM number**, case-insensitively, over the array column.
 *
 * Relevance ranking is still not attempted -- `ts_rank` is available now and
 * would be a real improvement, but ranking one of three id sets and not the
 * other two would produce an order that looks meaningful and is not.
 *
 * Every value is a bound parameter, and the substring branch uses position()
 * rather than a LIKE pattern, so there are no wildcards for a search term to
 * smuggle in -- see the note at that call site.
 */
async function matchingProductIds(where: Where, rawQuery: string): Promise<string[] | null> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;

  const normalized = normalizeFa(trimmed);
  // Matched with position(), not ILIKE. ILIKE would mean escaping `%` and `_`
  // in the needle and pairing that with an explicit ESCAPE clause, because a
  // shopper searching for "50%" must not match the entire catalogue --
  // three things to get right where position() has none. It asks the only
  // question this branch actually has: does searchText contain this text.
  // Neither form can use an index on a leading wildcard anyway, so nothing is
  // given up. (The first draft of this did use ILIKE, and its escaping was
  // wrong in a way the obvious test still passed.)

  const [textMatches, substringMatches, oemMatches] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Product"
      WHERE "deletedAt" IS NULL
        AND "searchVector" @@ plainto_tsquery('simple', ${normalized})
    `,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Product"
      WHERE "deletedAt" IS NULL
        AND position(lower(${normalized}) IN lower("searchText")) > 0
    `,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Product"
      WHERE "deletedAt" IS NULL
        AND EXISTS (
          SELECT 1 FROM unnest("oemNumbers") AS oem
          WHERE lower(oem) = lower(${trimmed})
        )
    `,
  ]);

  const matched = new Set<string>();
  for (const row of [...textMatches, ...substringMatches, ...oemMatches]) {
    matched.add(row.id);
  }
  if (matched.size === 0) return [];

  // The structured filter (vehicle, status, ...) is applied through Prisma
  // rather than folded into the SQL above, so exactly one definition of
  // "matches these filters" exists -- buildProductFilter's. The raw queries
  // answer only "does the text match", which is the part Prisma cannot express.
  const scoped = await prisma.product.findMany({
    where: { ...where, id: { in: [...matched] } },
    select: { id: true },
  });
  return scoped.map((row) => row.id);
}

interface CountedBucket {
  id: string;
  count: number;
}

async function hydrateFacetBuckets(
  delegate: {
    findMany(args: {
      where: Where;
      select: { id: true; nameFa: true; nameEn: true; slug: true };
    }): Promise<{ id: string; nameFa: string; nameEn: string; slug: string }[]>;
  },
  buckets: CountedBucket[],
): Promise<FacetBucket[]> {
  if (buckets.length === 0) return [];
  const rows = await delegate.findMany({
    where: { id: { in: buckets.map((bucket) => bucket.id) } },
    select: { id: true, nameFa: true, nameEn: true, slug: true },
  });
  const countById = new Map(buckets.map((bucket) => [bucket.id, bucket.count]));
  return rows.map((row) => ({
    id: row.id,
    name: localized(row),
    slug: row.slug,
    count: countById.get(row.id) ?? 0,
  }));
}

/**
 * Attribute-value buckets.
 *
 * Mongo reached these with `$unwind` over the inline attributes array and
 * grouped on `{key, value}`. With `ProductAttributeValue` as a real table the
 * same question is a plain `groupBy` over a join -- but Prisma's `groupBy`
 * cannot group by a *related* model's column, so the grouping key is
 * `(attributeId, value)` and the machine key and its Persian label are looked
 * up in one batched query afterwards. That second query existed under Mongo
 * too, for the label alone; it now carries the key as well.
 */
async function attributeFacets(where: Where): Promise<AttributeFacetBucket[]> {
  const buckets = await prisma.productAttributeValue.groupBy({
    by: ["attributeId", "value"],
    where: { product: { ...where, deletedAt: null } },
    _count: true,
  });
  if (buckets.length === 0) return [];

  const attributes = await prisma.attribute.findMany({
    where: { id: { in: [...new Set(buckets.map((bucket) => bucket.attributeId))] } },
    select: { id: true, key: true, name: true },
  });
  const byId = new Map(attributes.map((row) => [row.id, row]));

  return buckets.flatMap((bucket) => {
    const attribute = byId.get(bucket.attributeId);
    if (!attribute) return [];
    return [
      {
        key: attribute.key,
        keyLabel: attribute.name,
        value: bucket.value,
        count: bucket._count,
      },
    ];
  });
}

export class PostgresSearchProvider implements SearchProvider {
  async searchProducts(
    query: string,
    filters: ProductSearchFilters,
    pagination: PaginationQuery,
    accountType?: AccountType,
  ): Promise<PaginatedResult<ProductListItemDto>> {
    const where = await baseFilter(filters);
    const matchedIds = await matchingProductIds(where, query);

    if (matchedIds !== null && matchedIds.length === 0) {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
    const scoped: Where = matchedIds === null ? where : { ...where, id: { in: matchedIds } };
    const { data, meta } = await paginate<ProductRow>(
      prisma.product,
      "Product",
      scoped,
      pagination,
    );
    return { data: data.map((row) => toProductListItem(row, accountType)), meta };
  }

  // Each dimension's bucket counts are computed against every filter
  // EXCEPT that dimension's own current selection ("OR-facet" pattern) --
  // otherwise, picking a brand would collapse every other brand's count to
  // zero (its own filter would already exclude them), which defeats the
  // point of showing "how many if you picked this option instead." Every
  // other active filter (category, price, vehicle, ...) still applies.
  async getFacets(filters: ProductSearchFilters): Promise<ProductFacets> {
    const [categoryWhere, brandWhere, stockWhere, attributesWhere] = await Promise.all([
      buildProductFilter({ ...filters, category: undefined }),
      buildProductFilter({ ...filters, brand: undefined }),
      buildProductFilter({ ...filters, inStock: undefined }),
      buildProductFilter({ ...filters, attributes: undefined }),
    ]);

    const [categoryBuckets, brandBuckets, inStockCount, outOfStockCount, attributes] =
      await Promise.all([
        prisma.product.groupBy({ by: ["categoryId"], where: categoryWhere, _count: true }),
        prisma.product.groupBy({ by: ["brandId"], where: brandWhere, _count: true }),
        // Two counts rather than one grouped query: Mongo grouped on the
        // computed expression `{ $gt: ["$stock", 0] }`, and Prisma's groupBy
        // takes columns only, not expressions. Two counts say the same thing
        // in one round trip each and stay readable.
        prisma.product.count({ where: { ...stockWhere, stock: { gt: 0 } } }),
        prisma.product.count({ where: { ...stockWhere, stock: { lte: 0 } } }),
        attributeFacets(attributesWhere),
      ]);

    const [categories, brands] = await Promise.all([
      hydrateFacetBuckets(
        prisma.category,
        categoryBuckets.map((bucket) => ({ id: bucket.categoryId, count: bucket._count })),
      ),
      hydrateFacetBuckets(
        prisma.brand,
        brandBuckets.map((bucket) => ({ id: bucket.brandId, count: bucket._count })),
      ),
    ]);

    return {
      categories,
      brands,
      stock: [
        { inStock: true, count: inStockCount },
        { inStock: false, count: outOfStockCount },
      ],
      attributes,
    };
  }
}
