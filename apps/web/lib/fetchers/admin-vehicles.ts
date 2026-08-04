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

// One file for the vehicle tree and the fitment records that reference
// it: same screen group, same envelope/error boilerplate. The strict
// one-file-per-entity rule applies to packages/schemas, where it buys
// real tree-shaking -- see admin-catalog.ts for the same reasoning.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const VEHICLES = `${API_URL}/api/v1/admin/vehicles`;
const FITMENT = `${API_URL}/api/v1/admin/fitment`;

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

export type AdminVehicleResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

export interface AdminVehicleListPage<T> {
  data: T[];
  total: number;
}

/** Structural stand-in for a Zod schema -- see admin-catalog.ts. */
type Validator<T> = {
  safeParse: (input: unknown) => { success: true; data: T } | { success: false };
};

type ListEnvelope<T> = { data: T[]; meta: { total: number } };

async function getList<T>(
  url: string,
  params: Record<string, string | undefined>,
  schema: Validator<ListEnvelope<T>>,
): Promise<AdminVehicleListPage<T> | null> {
  try {
    const search = new URLSearchParams({ page: "1", limit: "100" });
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    const res = await fetch(`${url}?${search.toString()}`, { credentials: "include" });
    if (!res.ok) return null;
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) return null;
    return { data: parsed.data.data, total: parsed.data.meta.total };
  } catch {
    return null;
  }
}

async function write<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  schema: Validator<{ data: T }> | null,
  body?: unknown,
): Promise<AdminVehicleResult<T | null>> {
  try {
    const res = await fetch(url, {
      method,
      credentials: "include",
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
    // The 409 refusals name the real blocker and its count in Persian --
    // swallowing them for a generic string would defeat the guards.
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    if (!schema) return { ok: true, data: null };
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) return { ok: false, message: GENERIC_ERROR };
    return { ok: true, data: parsed.data.data };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

// --- Makes ----------------------------------------------------------------

export function fetchAdminMakes(
  filters: { q?: string; state?: string } = {},
): Promise<AdminVehicleListPage<AdminVehicleMakeDto> | null> {
  return getList(`${VEHICLES}/makes`, filters, adminVehicleMakeListResponseSchema);
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
  return getList(`${VEHICLES}/models`, filters, adminVehicleModelListResponseSchema);
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
  return getList(`${VEHICLES}/generations`, filters, adminVehicleGenListResponseSchema);
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
  return getList(`${VEHICLES}/engines`, filters, adminVehicleEngineListResponseSchema);
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
  const search = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) search.set(key, value);
  }
  return (async () => {
    try {
      const res = await fetch(`${FITMENT}?${search.toString()}`, { credentials: "include" });
      if (!res.ok) return null;
      const parsed = adminFitmentListResponseSchema.safeParse(await res.json());
      if (!parsed.success) return null;
      return { data: parsed.data.data, total: parsed.data.meta.total };
    } catch {
      return null;
    }
  })();
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
