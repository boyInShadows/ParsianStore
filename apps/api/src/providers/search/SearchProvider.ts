import type { AccountType } from "@prisma/client";
import type { LocalizedName, ProductListItemDto, VehicleKeyParts } from "schemas";
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
// the Attribute model's own doc comment) and `value` is already the exact
// Persian option string to display — neither needs a LocalizedName the way
// category/brand names do.
export interface AttributeFacetBucket {
  key: string;
  keyLabel: string;
  value: string;
  count: number;
}

// §9 `/catalog/facets`: "filter counts for the active query" — scoped
// to the same category/brand/price/attributes/vehicle filters the PLP's
// product grid uses (P5.S1), via the shared buildProductFilter.
export interface ProductFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  stock: StockFacetBucket[];
  attributes: AttributeFacetBucket[];
}

/**
 * Swappable per §8's provider-interface rule — accessed only through this
 * interface, never a concrete implementation, everywhere else in the app.
 * `SEARCH_DRIVER` (.env.example) anticipates a non-Postgres driver later
 * (Meilisearch, per §4's SEARCH_DRIVER/MEILI_* vars) without this
 * interface changing.
 *
 * `searchProducts` returns finished DTOs rather than rows, and takes the
 * viewer's `accountType` to do it. That is what makes the interface actually
 * swappable: a Meilisearch implementation has no Prisma rows to hand back,
 * and under the old signature every caller would have had to know which
 * driver it was talking to in order to shape the result.
 */
export interface SearchProvider {
  searchProducts(
    query: string,
    filters: ProductSearchFilters,
    pagination: PaginationQuery,
    accountType?: AccountType,
  ): Promise<PaginatedResult<ProductListItemDto>>;
  getFacets(filters: ProductSearchFilters): Promise<ProductFacets>;
}
