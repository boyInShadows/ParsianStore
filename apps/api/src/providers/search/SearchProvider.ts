import type { HydratedDocument } from "mongoose";
import type { VehicleKeyParts } from "schemas";
import type { LocalizedName } from "../../models/plugins.js";
import type { Product } from "../../models/Product.js";
import type { PaginatedResult, PaginationQuery } from "../../utils/pagination.js";

export interface ProductSearchFilters {
  category?: string;
  brand?: string;
  vehicle?: VehicleKeyParts;
  minPriceRial?: number;
  maxPriceRial?: number;
  attributes?: string;
  inStock?: boolean;
}

export interface FacetBucket {
  id: string;
  name: LocalizedName;
  slug: string;
  count: number;
}

export interface StockFacetBucket {
  inStock: boolean;
  count: number;
}

// Attribute.name has no {fa,en} pair (internal admin/filter label, per
// Attribute.ts's own doc comment) and `value` is already the exact Persian
// option string to display — neither needs a LocalizedName the way
// category/brand names do.
export interface AttributeFacetBucket {
  key: string;
  keyLabel: string;
  value: string;
  count: number;
}

// §9 `/catalog/facets`: "filter counts for the active query" — now scoped
// to the same category/brand/price/attributes/vehicle filters the PLP's
// product grid uses (P5.S1), via the shared buildProductFilter. Attribute-
// value faceting was deferred in P3 "until real products with attributes[]
// exist to facet over" (P3.S7 seeded them) — this is that follow-up.
export interface ProductFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  stock: StockFacetBucket[];
  attributes: AttributeFacetBucket[];
}

/** Swappable per §8's provider-interface rule — accessed only through this
 * interface, never a concrete implementation, everywhere else in the app.
 * `SEARCH_DRIVER` (.env.example) anticipates a non-Mongo driver later
 * (Meilisearch, per §4's SEARCH_DRIVER/MEILI_* vars) without this
 * interface changing. */
export interface SearchProvider {
  searchProducts(
    query: string,
    filters: ProductSearchFilters,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<HydratedDocument<Product>>>;
  getFacets(filters: ProductSearchFilters): Promise<ProductFacets>;
}
