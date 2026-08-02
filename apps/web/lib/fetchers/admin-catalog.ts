import {
  adminAttributeDetailResponseSchema,
  adminAttributeListResponseSchema,
  adminBrandDetailResponseSchema,
  adminBrandListResponseSchema,
  adminCategoryDetailResponseSchema,
  adminCategoryListResponseSchema,
  type AdminAttributeDto,
  type AdminBrandDto,
  type AdminCategoryDto,
  type AdminCreateAttributeInput,
  type AdminCreateBrandInput,
  type AdminCreateCategoryInput,
  type AttributeTypeDto,
} from "schemas";

// One file for all three taxonomy entities, unlike admin-coupons/-customers/
// -products. These are a single screen group (one nav entry, one tab bar) and
// splitting them would triplicate the identical envelope/error boilerplate
// below. The strict one-file-per-entity rule this repo follows applies to
// packages/schemas, where it buys real file-level tree-shaking; a fetcher
// module in the (admin) group has nothing equivalent to gain.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = `${API_URL}/api/v1/admin/catalog`;

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

export type AdminCatalogResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

export interface AdminCatalogListPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Structural stand-in for a Zod schema. `zod` is not a dependency of
 * apps/web — only of packages/schemas — so the shared response schemas are
 * consumed through the shape they expose rather than through `z.infer`.
 */
type Validator<T> = {
  safeParse: (input: unknown) => { success: true; data: T } | { success: false };
};

type ListEnvelope<T> = { data: T[]; meta: { total: number; page: number; limit: number } };

async function getList<T>(
  path: string,
  params: URLSearchParams,
  schema: Validator<ListEnvelope<T>>,
): Promise<AdminCatalogListPage<T> | null> {
  try {
    const res = await fetch(`${BASE}/${path}?${params.toString()}`, { credentials: "include" });
    if (!res.ok) return null;
    const parsed = schema.safeParse(await res.json());
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

async function write<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  schema: Validator<{ data: T }> | null,
  body?: unknown,
): Promise<AdminCatalogResult<T | null>> {
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method,
      credentials: "include",
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
    // The refusal messages the P8.S4 delete guards return (409, naming the
    // real blocker and its count in Persian) reach the UI through here —
    // swallowing them for a generic string would defeat the whole point.
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    if (!schema) return { ok: true, data: null };
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) return { ok: false, message: GENERIC_ERROR };
    return { ok: true, data: parsed.data.data };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

function listParams(
  page: number,
  limit: number,
  filters: Record<string, string | undefined>,
): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface AdminCategoryFilters extends Record<string, string | undefined> {
  q?: string;
  parentId?: string;
  systemCode?: string;
  state?: "active" | "deleted";
}

export function fetchAdminCategories(
  page: number,
  limit: number,
  filters: AdminCategoryFilters = {},
): Promise<AdminCatalogListPage<AdminCategoryDto> | null> {
  return getList("categories", listParams(page, limit, filters), adminCategoryListResponseSchema);
}

export function createAdminCategory(
  input: AdminCreateCategoryInput,
): Promise<AdminCatalogResult<AdminCategoryDto | null>> {
  return write("categories", "POST", adminCategoryDetailResponseSchema, input);
}

export function updateAdminCategory(
  id: string,
  input: Partial<AdminCreateCategoryInput>,
): Promise<AdminCatalogResult<AdminCategoryDto | null>> {
  return write(`categories/${id}`, "PATCH", adminCategoryDetailResponseSchema, input);
}

export function deleteAdminCategory(id: string): Promise<AdminCatalogResult<null>> {
  return write(`categories/${id}`, "DELETE", null);
}

export function restoreAdminCategory(
  id: string,
): Promise<AdminCatalogResult<AdminCategoryDto | null>> {
  return write(`categories/${id}/restore`, "POST", adminCategoryDetailResponseSchema);
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export interface AdminBrandFilters extends Record<string, string | undefined> {
  q?: string;
  isOEM?: "true" | "false";
  state?: "active" | "deleted";
}

export function fetchAdminBrands(
  page: number,
  limit: number,
  filters: AdminBrandFilters = {},
): Promise<AdminCatalogListPage<AdminBrandDto> | null> {
  return getList("brands", listParams(page, limit, filters), adminBrandListResponseSchema);
}

export function createAdminBrand(
  input: AdminCreateBrandInput,
): Promise<AdminCatalogResult<AdminBrandDto | null>> {
  return write("brands", "POST", adminBrandDetailResponseSchema, input);
}

export function updateAdminBrand(
  id: string,
  input: Partial<AdminCreateBrandInput>,
): Promise<AdminCatalogResult<AdminBrandDto | null>> {
  return write(`brands/${id}`, "PATCH", adminBrandDetailResponseSchema, input);
}

export function deleteAdminBrand(id: string): Promise<AdminCatalogResult<null>> {
  return write(`brands/${id}`, "DELETE", null);
}

export function restoreAdminBrand(id: string): Promise<AdminCatalogResult<AdminBrandDto | null>> {
  return write(`brands/${id}/restore`, "POST", adminBrandDetailResponseSchema);
}

// ---------------------------------------------------------------------------
// Attributes
// ---------------------------------------------------------------------------

export interface AdminAttributeFilters extends Record<string, string | undefined> {
  q?: string;
  type?: AttributeTypeDto;
  state?: "active" | "deleted";
}

export function fetchAdminAttributes(
  page: number,
  limit: number,
  filters: AdminAttributeFilters = {},
): Promise<AdminCatalogListPage<AdminAttributeDto> | null> {
  return getList("attributes", listParams(page, limit, filters), adminAttributeListResponseSchema);
}

export function createAdminAttribute(
  input: AdminCreateAttributeInput,
): Promise<AdminCatalogResult<AdminAttributeDto | null>> {
  return write("attributes", "POST", adminAttributeDetailResponseSchema, input);
}

export function updateAdminAttribute(
  id: string,
  input: Partial<AdminCreateAttributeInput>,
): Promise<AdminCatalogResult<AdminAttributeDto | null>> {
  return write(`attributes/${id}`, "PATCH", adminAttributeDetailResponseSchema, input);
}

export function deleteAdminAttribute(id: string): Promise<AdminCatalogResult<null>> {
  return write(`attributes/${id}`, "DELETE", null);
}

export function restoreAdminAttribute(
  id: string,
): Promise<AdminCatalogResult<AdminAttributeDto | null>> {
  return write(`attributes/${id}/restore`, "POST", adminAttributeDetailResponseSchema);
}
