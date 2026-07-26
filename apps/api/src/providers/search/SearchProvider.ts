import type { HydratedDocument } from "mongoose";
import type { VehicleKeyParts } from "schemas";
import type { LocalizedName } from "../../models/plugins.js";
import type { Product } from "../../models/Product.js";
import type { PaginatedResult, PaginationQuery } from "../../utils/pagination.js";

export interface ProductSearchFilters {
  vehicle?: VehicleKeyParts;
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

// §9 `/catalog/facets`: "filter counts for the active query" — category
// and brand today; attribute-value faceting is deferred until real
// products with attributes[] exist to facet over (P3.S7 seeds them).
export interface ProductFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  stock: StockFacetBucket[];
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
