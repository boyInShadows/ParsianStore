import {
  adminFitmentDetailResponseSchema,
  adminFitmentListResponseSchema,
  adminVehicleEngineDetailResponseSchema,
  adminVehicleEngineListResponseSchema,
  adminVehicleGenDetailResponseSchema,
  adminVehicleGenListResponseSchema,
  adminVehicleMakeDetailResponseSchema,
  adminVehicleMakeListResponseSchema,
  adminVehicleModelDetailResponseSchema,
  adminVehicleModelListResponseSchema,
  type AdminCreateFitmentInput,
  type AdminCreateVehicleEngineInput,
  type AdminCreateVehicleGenInput,
  type AdminCreateVehicleMakeInput,
  type AdminCreateVehicleModelInput,
  type AdminFitmentDto,
  type AdminVehicleEngineDto,
  type AdminVehicleGenDto,
  type AdminVehicleMakeDto,
  type AdminVehicleModelDto,
} from "schemas";
import {
  API_URL,
  apiAction,
  apiFetch,
  jsonBody,
  type ActionResult,
  type Validator,
} from "@/lib/api-fetch";

// One file for the vehicle tree and the fitment records that reference
// it: same screen group, same envelope/error boilerplate. The strict
// one-file-per-entity rule applies to packages/schemas, where it buys
// real tree-shaking -- see admin-catalog.ts for the same reasoning.

const VEHICLES = `${API_URL}/api/v1/admin/vehicles`;
const FITMENT = `${API_URL}/api/v1/admin/fitment`;

export type AdminVehicleResult<T> = ActionResult<T>;

export interface AdminVehicleListPage<T> {
  data: T[];
  total: number;
}

type ListEnvelope<T> = { data: T[]; meta: { total: number } };

async function getList<T>(
  url: string,
  search: URLSearchParams,
  schema: Validator<ListEnvelope<T>>,
): Promise<AdminVehicleListPage<T> | null> {
  const res = await apiFetch(`${url}?${search.toString()}`, schema, { credentials: "include" });
  return res.ok ? { data: res.data.data, total: res.data.meta.total } : null;
}

function searchParams(
  page: number,
  limit: number,
  filters: Record<string, string | undefined>,
): URLSearchParams {
  const search = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) search.set(key, value);
  }
  return search;
}

function write<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  schema: Validator<{ data: T }> | null,
  body?: unknown,
): Promise<AdminVehicleResult<T | null>> {
  // The 409 refusals name the real blocker and its count in Persian --
  // swallowing them for a generic string would defeat the guards.
  return apiAction(url, schema, {
    method,
    credentials: "include",
    ...(body === undefined ? {} : jsonBody(body)),
  });
}

// --- Makes ----------------------------------------------------------------

export function fetchAdminMakes(
  filters: { q?: string; state?: string } = {},
): Promise<AdminVehicleListPage<AdminVehicleMakeDto> | null> {
  return getList(
    `${VEHICLES}/makes`,
    searchParams(1, 100, filters),
    adminVehicleMakeListResponseSchema,
  );
}

export function createAdminMake(
  input: AdminCreateVehicleMakeInput,
): Promise<AdminVehicleResult<AdminVehicleMakeDto | null>> {
  return write(`${VEHICLES}/makes`, "POST", adminVehicleMakeDetailResponseSchema, input);
}

export function updateAdminMake(
  id: string,
  input: Partial<AdminCreateVehicleMakeInput>,
): Promise<AdminVehicleResult<AdminVehicleMakeDto | null>> {
  return write(`${VEHICLES}/makes/${id}`, "PATCH", adminVehicleMakeDetailResponseSchema, input);
}

export function deleteAdminMake(id: string): Promise<AdminVehicleResult<null>> {
  return write(`${VEHICLES}/makes/${id}`, "DELETE", null);
}

// --- Models ---------------------------------------------------------------

export function fetchAdminModels(
  filters: { makeId?: string; state?: string } = {},
): Promise<AdminVehicleListPage<AdminVehicleModelDto> | null> {
  return getList(
    `${VEHICLES}/models`,
    searchParams(1, 100, filters),
    adminVehicleModelListResponseSchema,
  );
}

export function createAdminModel(
  input: AdminCreateVehicleModelInput,
): Promise<AdminVehicleResult<AdminVehicleModelDto | null>> {
  return write(`${VEHICLES}/models`, "POST", adminVehicleModelDetailResponseSchema, input);
}

export function updateAdminModel(
  id: string,
  input: Partial<AdminCreateVehicleModelInput>,
): Promise<AdminVehicleResult<AdminVehicleModelDto | null>> {
  return write(`${VEHICLES}/models/${id}`, "PATCH", adminVehicleModelDetailResponseSchema, input);
}

export function deleteAdminModel(id: string): Promise<AdminVehicleResult<null>> {
  return write(`${VEHICLES}/models/${id}`, "DELETE", null);
}

// --- Generations ----------------------------------------------------------

export function fetchAdminGenerations(
  filters: { modelId?: string; state?: string } = {},
): Promise<AdminVehicleListPage<AdminVehicleGenDto> | null> {
  return getList(
    `${VEHICLES}/generations`,
    searchParams(1, 100, filters),
    adminVehicleGenListResponseSchema,
  );
}

export function createAdminGeneration(
  input: AdminCreateVehicleGenInput,
): Promise<AdminVehicleResult<AdminVehicleGenDto | null>> {
  return write(`${VEHICLES}/generations`, "POST", adminVehicleGenDetailResponseSchema, input);
}

export function updateAdminGeneration(
  id: string,
  input: AdminCreateVehicleGenInput,
): Promise<AdminVehicleResult<AdminVehicleGenDto | null>> {
  return write(
    `${VEHICLES}/generations/${id}`,
    "PATCH",
    adminVehicleGenDetailResponseSchema,
    input,
  );
}

export function deleteAdminGeneration(id: string): Promise<AdminVehicleResult<null>> {
  return write(`${VEHICLES}/generations/${id}`, "DELETE", null);
}

// --- Engines --------------------------------------------------------------

export function fetchAdminEngines(
  filters: { genId?: string; state?: string } = {},
): Promise<AdminVehicleListPage<AdminVehicleEngineDto> | null> {
  return getList(
    `${VEHICLES}/engines`,
    searchParams(1, 100, filters),
    adminVehicleEngineListResponseSchema,
  );
}

export function createAdminEngine(
  input: AdminCreateVehicleEngineInput,
): Promise<AdminVehicleResult<AdminVehicleEngineDto | null>> {
  return write(`${VEHICLES}/engines`, "POST", adminVehicleEngineDetailResponseSchema, input);
}

export function updateAdminEngine(
  id: string,
  input: Partial<AdminCreateVehicleEngineInput>,
): Promise<AdminVehicleResult<AdminVehicleEngineDto | null>> {
  return write(`${VEHICLES}/engines/${id}`, "PATCH", adminVehicleEngineDetailResponseSchema, input);
}

export function deleteAdminEngine(id: string): Promise<AdminVehicleResult<null>> {
  return write(`${VEHICLES}/engines/${id}`, "DELETE", null);
}

// --- Fitment --------------------------------------------------------------

export interface AdminFitmentFilters {
  productId?: string;
  makeId?: string;
  modelId?: string;
  confidence?: string;
  state?: string;
}

export function fetchAdminFitments(
  page: number,
  limit: number,
  filters: AdminFitmentFilters = {},
): Promise<AdminVehicleListPage<AdminFitmentDto> | null> {
  return getList(
    FITMENT,
    searchParams(page, limit, { ...filters }),
    adminFitmentListResponseSchema,
  );
}

export function createAdminFitment(
  input: AdminCreateFitmentInput,
): Promise<AdminVehicleResult<AdminFitmentDto | null>> {
  return write(FITMENT, "POST", adminFitmentDetailResponseSchema, input);
}

export function updateAdminFitment(
  id: string,
  input: AdminCreateFitmentInput,
): Promise<AdminVehicleResult<AdminFitmentDto | null>> {
  return write(`${FITMENT}/${id}`, "PATCH", adminFitmentDetailResponseSchema, input);
}

export function deleteAdminFitment(id: string): Promise<AdminVehicleResult<null>> {
  return write(`${FITMENT}/${id}`, "DELETE", null);
}

export function restoreAdminFitment(
  id: string,
): Promise<AdminVehicleResult<AdminFitmentDto | null>> {
  return write(`${FITMENT}/${id}/restore`, "POST", adminFitmentDetailResponseSchema);
}
