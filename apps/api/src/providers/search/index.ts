import { PostgresSearchProvider } from "./PostgresSearchProvider.js";
import type { SearchProvider } from "./SearchProvider.js";

// SEARCH_DRIVER is a single-value enum today (only "postgres" exists) — no
// switch needed yet, mirrors providers/storage/index.ts.
export const searchProvider: SearchProvider = new PostgresSearchProvider();
export type {
  FacetBucket,
  ProductFacets,
  ProductSearchFilters,
  SearchProvider,
} from "./SearchProvider.js";
