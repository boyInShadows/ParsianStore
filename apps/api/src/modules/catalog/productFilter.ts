import type { VehicleKeyParts } from "schemas";
import { prisma } from "../../config/prisma.js";
import type { Where } from "../../utils/pagination.js";
import { getFittingProductIds } from "../fitment/fitment.service.js";

// Shared by products.service.ts (the product list) and the search provider
// (facet counts) so both agree on exactly one definition of "matches these
// filters" -- P5.S1 needed facet counts scoped to the same category/brand/
// price/attributes/vehicle filters the PLP's own product grid uses, which
// would otherwise mean keeping two copies of this logic in sync by hand.
export interface ProductFilterInput {
  category?: string;
  brand?: string;
  vehicle?: VehicleKeyParts;
  minPriceRial?: number;
  maxPriceRial?: number;
  attributes?: string;
  inStock?: boolean;
}

// Sentinel filter that can never match a row -- used when a slug
// (category/brand) doesn't resolve to a real record, so the caller gets a
// real "zero results" query instead of accidentally matching everything.
const NEVER_MATCHES: Where = { id: { in: [] } };

/** "color:red,size:large" -> [["color","red"], ["size","large"]] — the
 * shape itself is already Zod-validated by the caller's query schema; this
 * just splits it into pairs for the relation conditions below. */
function parseAttributesParam(raw: string): [string, string][] {
  return raw.split(",").map((pair) => {
    const [key, value] = pair.split(":") as [string, string];
    return [key, value];
  });
}

export async function buildProductFilter(filters: ProductFilterInput): Promise<Where> {
  const where: Where = { status: "active" };

  if (filters.category) {
    const category = await prisma.category.findUnique({
      where: { slug: filters.category },
      select: { id: true },
    });
    if (!category) return NEVER_MATCHES;
    where.categoryId = category.id;
  }

  if (filters.brand) {
    const brand = await prisma.brand.findUnique({
      where: { slug: filters.brand },
      select: { id: true },
    });
    if (!brand) return NEVER_MATCHES;
    where.brandId = brand.id;
  }

  if (filters.vehicle) {
    const productIds = await getFittingProductIds(filters.vehicle);
    if (productIds.length === 0) return NEVER_MATCHES;
    where.id = { in: productIds };
  }

  if (filters.minPriceRial !== undefined || filters.maxPriceRial !== undefined) {
    where.priceRial = {
      ...(filters.minPriceRial !== undefined ? { gte: filters.minPriceRial } : {}),
      ...(filters.maxPriceRial !== undefined ? { lte: filters.maxPriceRial } : {}),
    };
  }

  if (filters.inStock) {
    where.stock = { gt: 0 };
  }

  if (filters.attributes) {
    // One `some` per pair, ANDed -- not a single `some` with both conditions.
    // A single one would ask for a row that matches every pair at once, which
    // no row can, since a ProductAttributeValue holds exactly one attribute.
    // The Mongo version had the same trap and solved it the same way, with
    // one `$elemMatch` per pair rather than one over the whole array.
    where.AND = parseAttributesParam(filters.attributes).map(([key, value]) => ({
      attributes: { some: { attribute: { key }, value } },
    }));
  }

  return where;
}
