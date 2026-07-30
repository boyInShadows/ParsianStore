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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AdminProductActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

// Client-side only, credentials:"include" -- same reasoning
// lib/fetchers/admin-orders.ts already established: this whole surface
// (filters, pagination, forms) is inherently interactive.

export interface AdminProductListPage {
  data: AdminProductSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAdminProducts(
  page: number,
  limit: number,
  status?: ProductStatusDto,
): Promise<AdminProductListPage | null> {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    const res = await fetch(`${API_URL}/api/v1/admin/catalog/products?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = adminProductListResponseSchema.safeParse(json);
    if (!parsed.success) return null;
    return {
      data: parsed.data.data,
      total: parsed.data.meta.total,
      page: parsed.data.meta.page,
      limit: parsed.data.meta.limit,
    };
  } catch {
    return null;
  }
}

export async function fetchAdminProduct(id: string): Promise<AdminProductDetailDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/catalog/products/${id}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = adminProductDetailResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

export async function createAdminProduct(
  input: AdminCreateProductInput,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/catalog/products`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = adminProductDetailResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function updateAdminProduct(
  id: string,
  input: AdminUpdateProductInput,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/catalog/products/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = adminProductDetailResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function archiveAdminProduct(
  id: string,
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/catalog/products/${id}/archive`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = adminProductDetailResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

// P3.S6's existing, previously-frontend-less endpoint -- see
// docs/decisions/0021-p8s2-admin-products.md.
export async function adjustAdminProductStock(
  productId: string,
  delta: number,
  reason: "manual-adjustment" | "restock",
): Promise<AdminProductActionResult<AdminProductDetailDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/inventory/adjust`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, delta, reason }),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = adminProductDetailResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

// Public, unauthenticated list endpoints reused as the admin form's
// dropdown data source -- no separate admin-only brand/category list
// endpoint is needed just to populate a <select>, the real catalog
// (~15 brands, ~10 categories) comfortably fits one page.
export async function fetchAllBrands(): Promise<BrandDto[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/brands?limit=100`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = brandsResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : [];
  } catch {
    return [];
  }
}

export async function fetchAllCategories(): Promise<CategoryDto[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/categories?limit=100`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = categoriesResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : [];
  } catch {
    return [];
  }
}
