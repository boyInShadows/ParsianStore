import {
  adminProductDetailResponseSchema,
  adminProductListResponseSchema,
  brandsResponseSchema,
  categoriesResponseSchema,
  type AdminCreateProductInput,
  type AdminProductDetailDto,
  type AdminProductSummaryDto,
  type AdminUpdateProductInput,
  type BrandDto,
  type CategoryDto,
  type ProductStatusDto,
} from "schemas";
import {
  API_URL,
  GENERIC_ERROR,
  apiAction,
  apiFetch,
  failureMessage,
  jsonBody,
  toPage,
  type ActionResult,
} from "@/lib/api-fetch";

export type AdminProductActionResult<T> = ActionResult<T>;

// Client-side only, credentials:"include" -- same reasoning
// lib/fetchers/admin-orders.ts already established: this whole surface
// (filters, pagination, forms) is inherently interactive.

export interface AdminProductListPage {
  data: AdminProductSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductImportResult {
  total: number;
  valid: number;
  imported: number;
  rows: Array<{ row: number; sku: string; ok: boolean; errors: string[] }>;
}
export async function importAdminProducts(
  file: File,
  commit = false,
): Promise<{ ok: true; data: ProductImportResult } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/catalog/products/import?commit=${commit}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "text/csv" },
      body: file,
    });
    if (!res.ok) return { ok: false, message: await failureMessage({ res }) };
    const json = (await res.json()) as { data?: ProductImportResult };
    return json.data ? { ok: true, data: json.data } : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function fetchAdminProducts(
  page: number,
  limit: number,
  status?: ProductStatusDto,
  q?: string,
): Promise<AdminProductListPage | null> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  // P8.S6: name/SKU search, used by the Fitment Manager's product picker.
  if (q) params.set("q", q);
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/catalog/products?${params.toString()}`,
    adminProductListResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? toPage(res.data) : null;
}

export async function fetchAdminProduct(id: string): Promise<AdminProductDetailDto | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/admin/catalog/products/${id}`,
    adminProductDetailResponseSchema,
    { credentials: "include" },
  );
  return res.ok ? res.data.data : null;
}

export function createAdminProduct(
  input: AdminCreateProductInput,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  return apiAction(`${API_URL}/api/v1/admin/catalog/products`, adminProductDetailResponseSchema, {
    method: "POST",
    credentials: "include",
    ...jsonBody(input),
  });
}

export function updateAdminProduct(
  id: string,
  input: AdminUpdateProductInput,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  return apiAction(
    `${API_URL}/api/v1/admin/catalog/products/${id}`,
    adminProductDetailResponseSchema,
    {
      method: "PATCH",
      credentials: "include",
      ...jsonBody(input),
    },
  );
}

export function archiveAdminProduct(
  id: string,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  return apiAction(
    `${API_URL}/api/v1/admin/catalog/products/${id}/archive`,
    adminProductDetailResponseSchema,
    {
      method: "POST",
      credentials: "include",
    },
  );
}

export async function uploadAdminProductMedia(
  id: string,
  file: File,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  const res = await apiAction(`${API_URL}/api/v1/admin/catalog/products/${id}/media`, null, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) return res;
  const product = await fetchAdminProduct(id);
  return product ? { ok: true, data: product } : { ok: false, message: GENERIC_ERROR };
}
export function removeAdminProductMedia(
  id: string,
  url: string,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  return apiAction(
    `${API_URL}/api/v1/admin/catalog/products/${id}/media`,
    adminProductDetailResponseSchema,
    {
      method: "DELETE",
      credentials: "include",
      ...jsonBody({ url }),
    },
  );
}

// P3.S6's existing, previously-frontend-less endpoint -- see
// docs/decisions/0021-p8s2-admin-products.md.
export function adjustAdminProductStock(
  productId: string,
  delta: number,
  reason: "manual-adjustment" | "restock",
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  return apiAction(`${API_URL}/api/v1/admin/inventory/adjust`, adminProductDetailResponseSchema, {
    method: "POST",
    credentials: "include",
    ...jsonBody({ productId, delta, reason }),
  });
}

// Public, unauthenticated list endpoints reused as the admin form's
// dropdown data source -- no separate admin-only brand/category list
// endpoint is needed just to populate a <select>, the real catalog
// (~15 brands, ~10 categories) comfortably fits one page.
export async function fetchAllBrands(): Promise<BrandDto[]> {
  const res = await apiFetch(`${API_URL}/api/v1/catalog/brands?limit=100`, brandsResponseSchema, {
    credentials: "include",
  });
  return res.ok ? res.data.data : [];
}

export async function fetchAllCategories(): Promise<CategoryDto[]> {
  const res = await apiFetch(
    `${API_URL}/api/v1/catalog/categories?limit=100`,
    categoriesResponseSchema,
    {
      credentials: "include",
    },
  );
  return res.ok ? res.data.data : [];
}
