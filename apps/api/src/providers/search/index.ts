import { MongoSearchProvider } from "./MongoSearchProvider.js";
import type { SearchProvider } from "./SearchProvider.js";

// SEARCH_DRIVER is a single-value enum today (only "mongo" exists) — no
// switch needed yet, mirrors providers/storage/index.ts.
export const searchProvider: SearchProvider = new MongoSearchProvider();
export type {
  FacetBucket,
  ProductFacets,
  ProductSearchFilters,
  SearchProvider,
} from "./SearchProvider.js";
