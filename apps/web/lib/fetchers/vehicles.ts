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

export async function fetchGenerations(modelId: string): Promise<VehicleGenDto[]> {
  const res = await fetch(
    `${API_URL}/api/v1/vehicles/generations?modelId=${modelId}&limit=${MAX_LIMIT}`,
  );
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
