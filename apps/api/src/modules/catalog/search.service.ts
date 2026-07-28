import type { HydratedDocument } from "mongoose";
import type { VehicleKeyParts } from "schemas";
import { searchProvider, type ProductFacets } from "../../providers/search/index.js";
import type { Product } from "../../models/Product.js";
import type { PaginatedResult, PaginationQuery } from "../../utils/pagination.js";
import type { FacetsQuery } from "./search.schema.js";

// Thin pass-through to the swappable searchProvider (§8) — kept as its
// own service (rather than calling searchProvider directly from the
// controller) so this module matches every other module's
// controller->service->model layering, even though there's no extra
// logic here yet.
export function searchProducts(
  query: string,
  vehicle: VehicleKeyParts | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<Product>>> {
  return searchProvider.searchProducts(query, { vehicle }, pagination);
}

export function getFacets(filters: FacetsQuery): Promise<ProductFacets> {
  return searchProvider.getFacets(filters);
}
