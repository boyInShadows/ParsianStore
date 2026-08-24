import {
  vehicleGenerationsResponseSchema,
  vehicleMakesResponseSchema,
  vehicleModelsResponseSchema,
  type VehicleGenDto,
  type VehicleMakeDto,
  type VehicleModelDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// masterPlan.md §9: every list endpoint is paginated, `limit` capped at
// 100. The real seeded tree (2 makes, 23 models, 31 generations) fits in
// one page each -- no pagination UI needed for a bounded reference list
// this small.
const MAX_LIMIT = 100;

export async function fetchMakes(): Promise<VehicleMakeDto[]> {
  const res = await fetch(`${API_URL}/api/v1/vehicles/makes?limit=${MAX_LIMIT}`);
  const json = await res.json();
  return vehicleMakesResponseSchema.parse(json).data;
}

export async function fetchModels(makeId: string): Promise<VehicleModelDto[]> {
  const res = await fetch(`${API_URL}/api/v1/vehicles/models?makeId=${makeId}&limit=${MAX_LIMIT}`);
  const json = await res.json();
  return vehicleModelsResponseSchema.parse(json).data;
}

/** Omit `modelId` for every generation in the tree -- the endpoint allows it. */
export async function fetchGenerations(modelId?: string): Promise<VehicleGenDto[]> {
  const filter = modelId ? `modelId=${modelId}&` : "";
  const res = await fetch(`${API_URL}/api/v1/vehicles/generations?${filter}limit=${MAX_LIMIT}`);
  const json = await res.json();
  return vehicleGenerationsResponseSchema.parse(json).data;
}

// fetchMakes/fetchModels above deliberately do NOT catch: VehicleSelector
// (client-side, react-query) needs the raw rejection to drive its own
// isError/isLoading state. Server Components rendered on every page load
// (Numbers, ShopByVehicle, Footer -- Footer especially, since it's global)
// want the opposite: graceful degradation, never a crashed page, if the
// API is unreachable. Found the hard way -- an unhandled rejection here
// took the whole site down in a build-with-API-down smoke test.
export type VehicleTreeEntry = { make: VehicleMakeDto; models: VehicleModelDto[] };

export type VehicleModelWithGenerations = {
  model: VehicleModelDto;
  /** Newest first. Empty when the model has no generation seeded yet. */
  generations: VehicleGenDto[];
};

export type VehicleTreeWithGenerations = {
  make: VehicleMakeDto;
  models: VehicleModelWithGenerations[];
};

/**
 * The whole tree down to generations, in three requests rather than one per
 * model. `modelId` is optional on `/vehicles/generations`, so all 31 seeded
 * generations arrive in a single page and are grouped here -- the alternative
 * was 23 sequential fetches to render one landing section.
 *
 * Exists because `/vehicle/[make]/[model]` is not a route: the shipped page is
 * `/vehicle/[make]/[model]/[gen]`, keyed by the generation's `yearFrom`. A link
 * that stops at the model 404s, which is exactly what the 2026-08-14 audit
 * found (item 1). A model with no generation therefore has no link to give,
 * and callers must render it as plain text rather than guessing a year.
 */
export async function fetchVehicleTreeWithGenerationsSafe(): Promise<VehicleTreeWithGenerations[]> {
  try {
    const [makes, generations] = await Promise.all([fetchMakes(), fetchGenerations()]);
    const byModel = new Map<string, VehicleGenDto[]>();
    for (const generation of generations) {
      byModel.set(generation.modelId, [...(byModel.get(generation.modelId) ?? []), generation]);
    }
    for (const list of byModel.values()) list.sort((a, b) => b.yearFrom - a.yearFrom);

    return await Promise.all(
      makes.map(async (make) => ({
        make,
        models: (await fetchModels(make.id)).map((model) => ({
          model,
          generations: byModel.get(model.id) ?? [],
        })),
      })),
    );
  } catch {
    return [];
  }
}

export async function fetchVehicleTreeSafe(): Promise<VehicleTreeEntry[]> {
  try {
    const makes = await fetchMakes();
    return await Promise.all(
      makes.map(async (make) => ({ make, models: await fetchModels(make.id) })),
    );
  } catch {
    return [];
  }
}

export async function fetchMakesSafe(): Promise<VehicleMakeDto[]> {
  try {
    return await fetchMakes();
  } catch {
    return [];
  }
}

export type VehicleRouteResult =
  | { ok: true; data: { make: VehicleMakeDto; model: VehicleModelDto; generation: VehicleGenDto } }
  | { ok: false; reason: "not-found" | "down" };

// Generation documents do not have a slug in the current data model. The
// stable, human-readable route segment is therefore their unique `yearFrom`
// within a model (the same natural key used by the idempotent vehicle seed).
export async function fetchVehicleRoute(
  makeSlug: string,
  modelSlug: string,
  generationYear: string,
): Promise<VehicleRouteResult> {
  try {
    const make = (await fetchMakes()).find((item) => item.slug === makeSlug);
    if (!make) return { ok: false, reason: "not-found" };
    const model = (await fetchModels(make.id)).find((item) => item.slug === modelSlug);
    if (!model) return { ok: false, reason: "not-found" };
    const generation = (await fetchGenerations(model.id)).find(
      (item) => String(item.yearFrom) === generationYear,
    );
    return generation
      ? { ok: true, data: { make, model, generation } }
      : { ok: false, reason: "not-found" };
  } catch {
    return { ok: false, reason: "down" };
  }
}

export type MakeRouteResult =
  | { ok: true; data: { make: VehicleMakeDto; models: VehicleModelWithGenerations[] } }
  | { ok: false; reason: "not-found" | "down" };

/**
 * One make's whole subtree, for `/vehicle/[make]`.
 *
 * The footer's vehicle column has always linked here, and until this route
 * existed both of its entries 404'd -- the same failure the 2026-08-14 audit
 * found one level down (item 1). Generations arrive in one unfiltered request
 * and are grouped locally, exactly as in
 * `fetchVehicleTreeWithGenerationsSafe`: 23 models would otherwise mean 23
 * sequential fetches to render one page.
 *
 * Unlike the `*Safe` helpers this distinguishes "no such make" from "the API is
 * down", because a page must 404 for the first and degrade for the second --
 * degrading on a typo'd slug would tell a crawler the URL is fine.
 */
export async function fetchMakeRoute(makeSlug: string): Promise<MakeRouteResult> {
  try {
    const make = (await fetchMakes()).find((item) => item.slug === makeSlug);
    if (!make) return { ok: false, reason: "not-found" };

    const [models, generations] = await Promise.all([fetchModels(make.id), fetchGenerations()]);
    const byModel = new Map<string, VehicleGenDto[]>();
    for (const generation of generations) {
      byModel.set(generation.modelId, [...(byModel.get(generation.modelId) ?? []), generation]);
    }
    for (const list of byModel.values()) list.sort((a, b) => b.yearFrom - a.yearFrom);

    return {
      ok: true,
      data: {
        make,
        models: models.map((model) => ({ model, generations: byModel.get(model.id) ?? [] })),
      },
    };
  } catch {
    return { ok: false, reason: "down" };
  }
}
