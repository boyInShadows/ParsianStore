import {
  categoriesResponseSchema,
  categoryResponseSchema,
  facetsResponseSchema,
  productDetailResponseSchema,
  productsResponseSchema,
  relatedProductsResponseSchema,
  searchProductsResponseSchema,
  type CategoryDto,
  type FacetsResponse,
  type ProductDetailDto,
  type ProductListItemDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The PLP route (P5.S1) needs to render three different states that a
// plain `T | null` can't tell apart: a real "this category doesn't exist"
// (-> notFound()), a real "zero products match these filters" (-> the
// EmptyState + clear-filters affordance), and "the API is unreachable"
// (-> a degraded-but-not-crashed page, same class of bug P4.S5's
// fetchVehicleTreeSafe fixed -- an outage must never look like a 404 or a
// silently empty catalog).
export type FetchResult<T> = { ok: true; data: T } | { ok: false; reason: "not-found" | "down" };

export async function fetchCategoryBySlug(slug: string): Promise<FetchResult<CategoryDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/categories/${slug}`);
    if (res.status === 404) return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = categoryResponseSchema.safeParse(json);
    return parsed.success ? { ok: true, data: parsed.data.data } : { ok: false, reason: "down" };
  } catch {
    return { ok: false, reason: "down" };
  }
}

// Root-first ancestor names for the breadcrumb. `path` is empty for every
// category today (P3.S7 seeded a flat structure), so this resolves to []
// in practice, but is written generically since Category/admin CRUD
// already support real subcategories (masterPlan §3.1).
export async function fetchCategoryAncestors(path: string[]): Promise<CategoryDto[]> {
  const results = await Promise.all(path.map((slug) => fetchCategoryBySlug(slug)));
  return results.filter((r): r is { ok: true; data: CategoryDto } => r.ok).map((r) => r.data);
}

// Direct children for the PLP's subcategory nav. Resolves to [] for every
// category today (same flat-seed reason as fetchCategoryAncestors above);
// failure degrades to [] rather than a FetchResult since subcategory nav
// is a nice-to-have, not primary page content the way the category itself is.
export async function fetchChildCategories(parentId: string): Promise<CategoryDto[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/categories?parentId=${parentId}&limit=100`);
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = categoriesResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : [];
  } catch {
    return [];
  }
}

export interface CatalogProductFilters {
  category?: string;
  brand?: string;
  vehicle?: string;
  minPriceRial?: number;
  maxPriceRial?: number;
  attributes?: string;
  inStock?: boolean;
  sort?: "newest" | "price-asc" | "price-desc";
  cursor?: string;
  limit?: number;
}

function buildQueryString(filters: CatalogProductFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.vehicle) params.set("vehicle", filters.vehicle);
  if (filters.minPriceRial !== undefined) params.set("minPriceRial", String(filters.minPriceRial));
  if (filters.maxPriceRial !== undefined) params.set("maxPriceRial", String(filters.maxPriceRial));
  if (filters.attributes) params.set("attributes", filters.attributes);
  if (filters.inStock) params.set("inStock", "true");
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 24));
  return params.toString();
}

export interface CatalogProductsPage {
  data: ProductListItemDto[];
  nextCursor: string | null;
}

// `cookieHeader` (P6.S1): a Server Component's own `fetch()` has no
// browser cookie jar to attach automatically -- unlike the client-side
// callers of this same function (LoadMoreProducts.tsx), which get
// `credentials: "include"` below for free. PDP/PLP/search's page.tsx
// files pass `(await cookies()).toString()` here so `optionalAuth` on the
// API side can resolve the viewer's real accountType (wholesale pricing)
// instead of always seeing an anonymous request. Omitted entirely by
// client-side callers, who rely on the browser's own cookie jar instead.
export async function fetchCatalogProducts(
  filters: CatalogProductFilters,
  cookieHeader?: string,
): Promise<FetchResult<CatalogProductsPage>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/products?${buildQueryString(filters)}`, {
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = productsResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: "down" };
    return { ok: true, data: { data: parsed.data.data, nextCursor: parsed.data.meta.nextCursor } };
  } catch {
    return { ok: false, reason: "down" };
  }
}

export async function fetchProductDetailBySlug(
  slug: string,
  cookieHeader?: string,
): Promise<FetchResult<ProductDetailDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/products/${slug}`, {
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (res.status === 404) return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = productDetailResponseSchema.safeParse(json);
    return parsed.success ? { ok: true, data: parsed.data.data } : { ok: false, reason: "down" };
  } catch {
    return { ok: false, reason: "down" };
  }
}

// Bounded widget (masterPlan §5's "related & alternative parts"), not
// primary page content -- degrades to [] on failure rather than a
// FetchResult, same reasoning as fetchChildCategories.
export async function fetchRelatedProducts(
  slug: string,
  limit = 8,
  cookieHeader?: string,
): Promise<ProductListItemDto[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/products/${slug}/related?limit=${limit}`, {
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = relatedProductsResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : [];
  } catch {
    return [];
  }
}

export interface SearchResultsPage {
  data: ProductListItemDto[];
  total: number;
  page: number;
  limit: number;
}

// Primary page content (a real search results page, not a secondary
// widget) -- FetchResult, same reasoning as fetchCatalogProducts: "zero
// matches" and "API unreachable" need different UI, not one falsy value.
export async function fetchSearchResults(
  q: string,
  page = 1,
  limit = 20,
  cookieHeader?: string,
): Promise<FetchResult<SearchResultsPage>> {
  try {
    const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
    const res = await fetch(`${API_URL}/api/v1/catalog/search?${params.toString()}`, {
      credentials: "include",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = searchProductsResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: "down" };
    return {
      ok: true,
      data: {
        data: parsed.data.data,
        total: parsed.data.meta.total,
        page: parsed.data.meta.page,
        limit: parsed.data.meta.limit,
      },
    };
  } catch {
    return { ok: false, reason: "down" };
  }
}

export type CatalogFacetFilters = Omit<CatalogProductFilters, "sort" | "cursor" | "limit">;

// `null` (not a FetchResult) on failure: the filter bar degrades to
// showing every option with no count rather than blocking the whole page
// the way a missing category/product page would -- counts are a nice-to-
// have here, not the primary content.
export async function fetchCatalogFacets(
  filters: CatalogFacetFilters,
): Promise<FacetsResponse["data"] | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/facets?${buildQueryString(filters)}`);
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = facetsResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}
