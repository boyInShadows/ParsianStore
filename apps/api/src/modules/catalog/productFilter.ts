import type { FilterQuery } from "mongoose";
import type { VehicleKeyParts } from "schemas";
import { getFittingProductIds } from "../fitment/fitment.service.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import type { Product } from "../../models/Product.js";

// Shared by products.service.ts (the product list) and MongoSearchProvider
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

// Sentinel filter that can never match a document -- used when a slug
// (category/brand) doesn't resolve to a real record, so the caller gets a
// real "zero results" query instead of accidentally matching everything.
const NEVER_MATCHES: FilterQuery<Product> = { _id: { $in: [] } };

/** "color:red,size:large" -> [["color","red"], ["size","large"]] — the
 * shape itself is already Zod-validated by the caller's query schema; this
 * just splits it into pairs for the `$elemMatch` conditions below. */
function parseAttributesParam(raw: string): [string, string][] {
  return raw.split(",").map((pair) => {
    const [key, value] = pair.split(":") as [string, string];
    return [key, value];
  });
}

export async function buildProductFilter(
  filters: ProductFilterInput,
): Promise<FilterQuery<Product>> {
  const filter: FilterQuery<Product> = { status: "active" };

  if (filters.category) {
    const category = await CategoryModel.findOne({ slug: filters.category });
    if (!category) return NEVER_MATCHES;
    filter.categoryId = category._id;
  }

  if (filters.brand) {
    const brand = await BrandModel.findOne({ slug: filters.brand });
    if (!brand) return NEVER_MATCHES;
    filter.brandId = brand._id;
  }

  if (filters.vehicle) {
    const productIds = await getFittingProductIds(filters.vehicle);
    if (productIds.length === 0) return NEVER_MATCHES;
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

  return filter;
}
