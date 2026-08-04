import type { FilterQuery, HydratedDocument } from "mongoose";
import type {
  AdminVehicleEngineDto,
  AdminVehicleGenDto,
  AdminVehicleMakeDto,
  AdminVehicleModelDto,
} from "schemas";
import { VehicleEngineModel, type VehicleEngine } from "../../models/VehicleEngine.js";
import { VehicleGenModel, type VehicleGen } from "../../models/VehicleGen.js";
import { VehicleMakeModel, type VehicleMake } from "../../models/VehicleMake.js";
import { VehicleModelModel, type VehicleModel } from "../../models/VehicleModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationMeta, type PaginationQuery } from "../../utils/pagination.js";
import { escapeRegExp } from "../../utils/regex.js";
import {
  assertEngineDeletable,
  assertGenerationDeletable,
  assertMakeDeletable,
  assertModelDeletable,
  countEnginesByGeneration,
  countFitmentsBy,
  countGenerationsByModel,
  countModelsByMake,
} from "./vehicleUsage.js";
import type {
  AdminVehicleEngineListQuery,
  AdminVehicleGenListQuery,
  AdminVehicleMakeListQuery,
  AdminVehicleModelListQuery,
  CreateVehicleEngineInput,
  CreateVehicleGenInput,
  CreateVehicleMakeInput,
  CreateVehicleModelInput,
  UpdateVehicleEngineInput,
  UpdateVehicleMakeInput,
  UpdateVehicleModelInput,
} from "./vehicles.admin.schema.js";

/** See categories.admin.service.ts for why this shape, not `$in: [null, ...]`. */
const ANY_STATE = { deletedAt: { $exists: true } } as const;

function stateFilter(state: "active" | "deleted" | undefined): { deletedAt: unknown } {
  return state === "deleted" ? { deletedAt: { $ne: null } } : { deletedAt: null };
}

export interface Listed<T> {
  data: T[];
  meta: PaginationMeta;
}

// --- Makes ----------------------------------------------------------------

const MAKE_NOT_FOUND = "برند خودرو یافت نشد";

function buildMakeFilter(filters: { q?: string; state?: string }): FilterQuery<VehicleMake> {
  const filter: FilterQuery<VehicleMake> = stateFilter(filters.state as "active" | "deleted");
  if (filters.q) {
    const escaped = escapeRegExp(filters.q);
    filter.$or = [
      { "name.fa": { $regex: escaped } },
      { "name.en": { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
    ];
  }
  return filter;
}

async function hydrateMakes(docs: HydratedDocument<VehicleMake>[]): Promise<AdminVehicleMakeDto[]> {
  const ids = docs.map((doc) => String(doc._id));
  const [models, fitments] = await Promise.all([
    countModelsByMake(ids),
    countFitmentsBy("makeId", ids),
  ]);
  return docs.map((doc) => ({
    id: String(doc._id),
    name: { fa: doc.name.fa, en: doc.name.en },
    slug: doc.slug,
    ...(doc.logo ? { logo: doc.logo } : {}),
    country: doc.country,
    isDomestic: doc.isDomestic,
    modelCount: models.get(String(doc._id)) ?? 0,
    fitmentCount: fitments.get(String(doc._id)) ?? 0,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  }));
}

async function hydrateOneMake(doc: HydratedDocument<VehicleMake>): Promise<AdminVehicleMakeDto> {
  const [dto] = await hydrateMakes([doc]);
  if (!dto) throw new ApiError(404, MAKE_NOT_FOUND);
  return dto;
}

export async function listAdminMakes(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleMakeListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleMakeDto>> {
  const { data, meta } = await paginate(VehicleMakeModel, buildMakeFilter(filters), {
    ...pagination,
    sort: pagination.sort ?? "slug",
  });
  return { data: await hydrateMakes(data), meta };
}

async function findAnyMake(id: string): Promise<HydratedDocument<VehicleMake>> {
  const doc = await VehicleMakeModel.findOne({ _id: id, ...ANY_STATE });
  if (!doc) throw new ApiError(404, MAKE_NOT_FOUND);
  return doc;
}

export async function createMake(input: CreateVehicleMakeInput): Promise<AdminVehicleMakeDto> {
  return hydrateOneMake(await VehicleMakeModel.create({ isDomestic: false, ...input }));
}

export async function updateMake(
  id: string,
  input: UpdateVehicleMakeInput,
): Promise<AdminVehicleMakeDto> {
  const doc = await VehicleMakeModel.findById(id);
  if (!doc) throw new ApiError(404, MAKE_NOT_FOUND);
  Object.assign(doc, input);
  await doc.save();
  return hydrateOneMake(doc);
}

export async function deleteMake(id: string): Promise<void> {
  const doc = await VehicleMakeModel.findById(id);
  if (!doc) throw new ApiError(404, MAKE_NOT_FOUND);
  await assertMakeDeletable(id);
  await doc.softDelete();
}

export async function restoreMake(id: string): Promise<AdminVehicleMakeDto> {
  const doc = await findAnyMake(id);
  doc.deletedAt = null;
  await doc.save();
  return hydrateOneMake(doc);
}

// --- Models ---------------------------------------------------------------

const MODEL_NOT_FOUND = "مدل خودرو یافت نشد";

async function hydrateModels(
  docs: HydratedDocument<VehicleModel>[],
): Promise<AdminVehicleModelDto[]> {
  const ids = docs.map((doc) => String(doc._id));
  const [generations, fitments] = await Promise.all([
    countGenerationsByModel(ids),
    countFitmentsBy("modelId", ids),
  ]);
  return docs.map((doc) => ({
    id: String(doc._id),
    makeId: String(doc.makeId),
    name: { fa: doc.name.fa, en: doc.name.en },
    slug: doc.slug,
    bodyType: doc.bodyType,
    generationCount: generations.get(String(doc._id)) ?? 0,
    fitmentCount: fitments.get(String(doc._id)) ?? 0,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  }));
}

async function hydrateOneModel(doc: HydratedDocument<VehicleModel>): Promise<AdminVehicleModelDto> {
  const [dto] = await hydrateModels([doc]);
  if (!dto) throw new ApiError(404, MODEL_NOT_FOUND);
  return dto;
}

/**
 * A model/generation/engine whose parent does not exist would be
 * invisible in the cascading manager and unreachable from the storefront
 * selector -- rejected at write time rather than created and orphaned.
 */
async function assertMakeExists(makeId: string): Promise<void> {
  const exists = await VehicleMakeModel.exists({ _id: makeId });
  if (!exists) throw new ApiError(400, "برند خودروی انتخاب‌شده یافت نشد");
}

export async function listAdminModels(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleModelListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleModelDto>> {
  const filter: FilterQuery<VehicleModel> = stateFilter(filters.state);
  if (filters.makeId) filter.makeId = filters.makeId;
  if (filters.bodyType) filter.bodyType = filters.bodyType;
  const { data, meta } = await paginate(VehicleModelModel, filter, {
    ...pagination,
    sort: pagination.sort ?? "slug",
  });
  return { data: await hydrateModels(data), meta };
}

export async function createModel(input: CreateVehicleModelInput): Promise<AdminVehicleModelDto> {
  await assertMakeExists(input.makeId);
  return hydrateOneModel(await VehicleModelModel.create(input));
}

export async function updateModel(
  id: string,
  input: UpdateVehicleModelInput,
): Promise<AdminVehicleModelDto> {
  const doc = await VehicleModelModel.findById(id);
  if (!doc) throw new ApiError(404, MODEL_NOT_FOUND);
  if (input.makeId) await assertMakeExists(input.makeId);
  Object.assign(doc, input);
  await doc.save();
  return hydrateOneModel(doc);
}

export async function deleteModel(id: string): Promise<void> {
  const doc = await VehicleModelModel.findById(id);
  if (!doc) throw new ApiError(404, MODEL_NOT_FOUND);
  await assertModelDeletable(id);
  await doc.softDelete();
}

export async function restoreModel(id: string): Promise<AdminVehicleModelDto> {
  const doc = await VehicleModelModel.findOne({ _id: id, ...ANY_STATE });
  if (!doc) throw new ApiError(404, MODEL_NOT_FOUND);
  doc.deletedAt = null;
  await doc.save();
  return hydrateOneModel(doc);
}

// --- Generations ----------------------------------------------------------

const GEN_NOT_FOUND = "نسل خودرو یافت نشد";

async function hydrateGenerations(
  docs: HydratedDocument<VehicleGen>[],
): Promise<AdminVehicleGenDto[]> {
  const ids = docs.map((doc) => String(doc._id));
  const [engines, fitments] = await Promise.all([
    countEnginesByGeneration(ids),
    countFitmentsBy("genId", ids),
  ]);
  return docs.map((doc) => ({
    id: String(doc._id),
    modelId: String(doc.modelId),
    name: { fa: doc.name.fa, en: doc.name.en },
    yearFrom: doc.yearFrom,
    yearTo: doc.yearTo,
    facelift: doc.facelift,
    engineCount: engines.get(String(doc._id)) ?? 0,
    fitmentCount: fitments.get(String(doc._id)) ?? 0,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  }));
}

async function hydrateOneGeneration(
  doc: HydratedDocument<VehicleGen>,
): Promise<AdminVehicleGenDto> {
  const [dto] = await hydrateGenerations([doc]);
  if (!dto) throw new ApiError(404, GEN_NOT_FOUND);
  return dto;
}

async function assertModelExists(modelId: string): Promise<void> {
  const exists = await VehicleModelModel.exists({ _id: modelId });
  if (!exists) throw new ApiError(400, "مدل انتخاب‌شده یافت نشد");
}

export async function listAdminGenerations(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleGenListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleGenDto>> {
  const filter: FilterQuery<VehicleGen> = stateFilter(filters.state);
  if (filters.modelId) filter.modelId = filters.modelId;
  const { data, meta } = await paginate(VehicleGenModel, filter, {
    ...pagination,
    sort: pagination.sort ?? "yearFrom",
  });
  return { data: await hydrateGenerations(data), meta };
}

export async function createGeneration(input: CreateVehicleGenInput): Promise<AdminVehicleGenDto> {
  await assertModelExists(input.modelId);
  return hydrateOneGeneration(await VehicleGenModel.create({ facelift: false, ...input }));
}

export async function updateGeneration(
  id: string,
  input: CreateVehicleGenInput,
): Promise<AdminVehicleGenDto> {
  const doc = await VehicleGenModel.findById(id);
  if (!doc) throw new ApiError(404, GEN_NOT_FOUND);
  await assertModelExists(input.modelId);
  Object.assign(doc, { facelift: false, ...input });
  await doc.save();
  return hydrateOneGeneration(doc);
}

export async function deleteGeneration(id: string): Promise<void> {
  const doc = await VehicleGenModel.findById(id);
  if (!doc) throw new ApiError(404, GEN_NOT_FOUND);
  await assertGenerationDeletable(id);
  await doc.softDelete();
}

export async function restoreGeneration(id: string): Promise<AdminVehicleGenDto> {
  const doc = await VehicleGenModel.findOne({ _id: id, ...ANY_STATE });
  if (!doc) throw new ApiError(404, GEN_NOT_FOUND);
  doc.deletedAt = null;
  await doc.save();
  return hydrateOneGeneration(doc);
}

// --- Engines --------------------------------------------------------------

const ENGINE_NOT_FOUND = "موتور یافت نشد";

async function hydrateEngines(
  docs: HydratedDocument<VehicleEngine>[],
): Promise<AdminVehicleEngineDto[]> {
  const ids = docs.map((doc) => String(doc._id));
  const fitments = await countFitmentsBy("engineId", ids);
  return docs.map((doc) => ({
    id: String(doc._id),
    genId: String(doc.genId),
    code: doc.code,
    displacement: doc.displacement,
    fuel: doc.fuel,
    power: doc.power,
    fitmentCount: fitments.get(String(doc._id)) ?? 0,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  }));
}

async function hydrateOneEngine(
  doc: HydratedDocument<VehicleEngine>,
): Promise<AdminVehicleEngineDto> {
  const [dto] = await hydrateEngines([doc]);
  if (!dto) throw new ApiError(404, ENGINE_NOT_FOUND);
  return dto;
}

async function assertGenerationExists(genId: string): Promise<void> {
  const exists = await VehicleGenModel.exists({ _id: genId });
  if (!exists) throw new ApiError(400, "نسل انتخاب‌شده یافت نشد");
}

export async function listAdminEngines(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleEngineListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleEngineDto>> {
  const filter: FilterQuery<VehicleEngine> = stateFilter(filters.state);
  if (filters.genId) filter.genId = filters.genId;
  if (filters.fuel) filter.fuel = filters.fuel;
  const { data, meta } = await paginate(VehicleEngineModel, filter, {
    ...pagination,
    sort: pagination.sort ?? "code",
  });
  return { data: await hydrateEngines(data), meta };
}

export async function createEngine(
  input: CreateVehicleEngineInput,
): Promise<AdminVehicleEngineDto> {
  await assertGenerationExists(input.genId);
  return hydrateOneEngine(await VehicleEngineModel.create(input));
}

export async function updateEngine(
  id: string,
  input: UpdateVehicleEngineInput,
): Promise<AdminVehicleEngineDto> {
  const doc = await VehicleEngineModel.findById(id);
  if (!doc) throw new ApiError(404, ENGINE_NOT_FOUND);
  if (input.genId) await assertGenerationExists(input.genId);
  Object.assign(doc, input);
  await doc.save();
  return hydrateOneEngine(doc);
}

export async function deleteEngine(id: string): Promise<void> {
  const doc = await VehicleEngineModel.findById(id);
  if (!doc) throw new ApiError(404, ENGINE_NOT_FOUND);
  await assertEngineDeletable(id);
  await doc.softDelete();
}

export async function restoreEngine(id: string): Promise<AdminVehicleEngineDto> {
  const doc = await VehicleEngineModel.findOne({ _id: id, ...ANY_STATE });
  if (!doc) throw new ApiError(404, ENGINE_NOT_FOUND);
  doc.deletedAt = null;
  await doc.save();
  return hydrateOneEngine(doc);
}
