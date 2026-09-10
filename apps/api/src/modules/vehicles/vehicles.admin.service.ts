import type {
  AdminVehicleEngineDto,
  AdminVehicleGenDto,
  AdminVehicleMakeDto,
  AdminVehicleModelDto,
} from "schemas";
import { ANY_STATE, prisma, softDeleteData, stateFilter } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginationMeta,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import { localized, toColumns } from "../../utils/serialize.js";
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

export interface Listed<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Case-insensitive contains, the Postgres replacement for the escaped `$regex`
 * these filters used under Mongo.
 *
 * Worth noting what this fixes rather than merely ports: the old code built a
 * regex out of user input and escaped it by hand, and its Persian branch was
 * case-sensitive while the two Latin branches were not -- a difference with no
 * reason behind it. `contains` takes the needle as a bound parameter, so there
 * is nothing to escape and no way to smuggle a pattern in.
 */
function search(q: string): Where {
  const contains = { contains: q, mode: "insensitive" as const };
  return { OR: [{ nameFa: contains }, { nameEn: contains }, { slug: contains }] };
}

function deletedAtIso(row: { deletedAt: Date | null }): string | null {
  return row.deletedAt ? row.deletedAt.toISOString() : null;
}

// --- Makes ----------------------------------------------------------------

const MAKE_NOT_FOUND = "برند خودرو یافت نشد";

interface MakeRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  logo: string | null;
  country: string;
  isDomestic: boolean;
  deletedAt: Date | null;
}

function buildMakeFilter(filters: { q?: string; state?: "active" | "deleted" | "any" }): Where {
  return { ...stateFilter(filters.state), ...(filters.q ? search(filters.q) : {}) };
}

async function hydrateMakes(rows: MakeRow[]): Promise<AdminVehicleMakeDto[]> {
  const ids = rows.map((row) => row.id);
  const [models, fitments] = await Promise.all([
    countModelsByMake(ids),
    countFitmentsBy("makeId", ids),
  ]);
  return rows.map((row) => ({
    id: row.id,
    name: localized(row),
    slug: row.slug,
    ...(row.logo ? { logo: row.logo } : {}),
    country: row.country,
    isDomestic: row.isDomestic,
    modelCount: models.get(row.id) ?? 0,
    fitmentCount: fitments.get(row.id) ?? 0,
    deletedAt: deletedAtIso(row),
  }));
}

async function hydrateOneMake(row: MakeRow): Promise<AdminVehicleMakeDto> {
  const [dto] = await hydrateMakes([row]);
  if (!dto) throw new ApiError(404, MAKE_NOT_FOUND);
  return dto;
}

export async function listAdminMakes(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleMakeListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleMakeDto>> {
  const { data, meta } = await paginate<MakeRow>(
    prisma.vehicleMake,
    "VehicleMake",
    buildMakeFilter(filters),
    { ...pagination, sort: pagination.sort ?? "slug" },
  );
  return { data: await hydrateMakes(data), meta };
}

/** Live rows only -- what an edit or a delete is allowed to act on. */
async function findMake(id: string): Promise<MakeRow> {
  const row = await prisma.vehicleMake.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, MAKE_NOT_FOUND);
  return row;
}

/** Live or soft-deleted -- what restore has to be able to find. */
async function findAnyMake(id: string): Promise<MakeRow> {
  const row = await prisma.vehicleMake.findFirst({ where: { id, ...ANY_STATE } });
  if (!row) throw new ApiError(404, MAKE_NOT_FOUND);
  return row;
}

export async function createMake(input: CreateVehicleMakeInput): Promise<AdminVehicleMakeDto> {
  const { name, ...rest } = input;
  return hydrateOneMake(
    await prisma.vehicleMake.create({ data: { isDomestic: false, ...rest, ...toColumns(name) } }),
  );
}

export async function updateMake(
  id: string,
  input: UpdateVehicleMakeInput,
): Promise<AdminVehicleMakeDto> {
  await findMake(id);
  const { name, ...rest } = input;
  return hydrateOneMake(
    await prisma.vehicleMake.update({
      where: { id },
      data: { ...rest, ...(name ? toColumns(name) : {}) },
    }),
  );
}

export async function deleteMake(id: string): Promise<void> {
  await findMake(id);
  await assertMakeDeletable(id);
  await prisma.vehicleMake.update({ where: { id }, data: softDeleteData() });
}

export async function restoreMake(id: string): Promise<AdminVehicleMakeDto> {
  await findAnyMake(id);
  // The where names deletedAt, so the soft-delete filter steps aside and the
  // tombstoned row is reachable -- without it this would update nothing.
  return hydrateOneMake(
    await prisma.vehicleMake.update({ where: { id, ...ANY_STATE }, data: { deletedAt: null } }),
  );
}

// --- Models ---------------------------------------------------------------

const MODEL_NOT_FOUND = "مدل خودرو یافت نشد";

interface ModelRow {
  id: string;
  makeId: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  bodyType: string;
  deletedAt: Date | null;
}

async function hydrateModels(rows: ModelRow[]): Promise<AdminVehicleModelDto[]> {
  const ids = rows.map((row) => row.id);
  const [generations, fitments] = await Promise.all([
    countGenerationsByModel(ids),
    countFitmentsBy("modelId", ids),
  ]);
  return rows.map((row) => ({
    id: row.id,
    makeId: row.makeId,
    name: localized(row),
    slug: row.slug,
    bodyType: row.bodyType as AdminVehicleModelDto["bodyType"],
    generationCount: generations.get(row.id) ?? 0,
    fitmentCount: fitments.get(row.id) ?? 0,
    deletedAt: deletedAtIso(row),
  }));
}

async function hydrateOneModel(row: ModelRow): Promise<AdminVehicleModelDto> {
  const [dto] = await hydrateModels([row]);
  if (!dto) throw new ApiError(404, MODEL_NOT_FOUND);
  return dto;
}

/**
 * A model/generation/engine whose parent does not exist would be
 * invisible in the cascading manager and unreachable from the storefront
 * selector -- rejected at write time rather than created and orphaned.
 *
 * The foreign keys in Postgres would now reject it as well, but with a
 * constraint-violation message no Persian-speaking admin should ever have to
 * read. This check stays for the message, not for the integrity.
 */
async function assertMakeExists(makeId: string): Promise<void> {
  const exists = await prisma.vehicleMake.findUnique({
    where: { id: makeId },
    select: { id: true },
  });
  if (!exists) throw new ApiError(400, "برند خودروی انتخاب‌شده یافت نشد");
}

export async function listAdminModels(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleModelListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleModelDto>> {
  const where: Where = stateFilter(filters.state);
  if (filters.makeId) where.makeId = filters.makeId;
  if (filters.bodyType) where.bodyType = filters.bodyType;
  const { data, meta } = await paginate<ModelRow>(prisma.vehicleModel, "VehicleModel", where, {
    ...pagination,
    sort: pagination.sort ?? "slug",
  });
  return { data: await hydrateModels(data), meta };
}

async function findModel(id: string): Promise<ModelRow> {
  const row = await prisma.vehicleModel.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, MODEL_NOT_FOUND);
  return row;
}

export async function createModel(input: CreateVehicleModelInput): Promise<AdminVehicleModelDto> {
  await assertMakeExists(input.makeId);
  const { name, ...rest } = input;
  return hydrateOneModel(
    await prisma.vehicleModel.create({ data: { ...rest, ...toColumns(name) } }),
  );
}

export async function updateModel(
  id: string,
  input: UpdateVehicleModelInput,
): Promise<AdminVehicleModelDto> {
  await findModel(id);
  if (input.makeId) await assertMakeExists(input.makeId);
  const { name, ...rest } = input;
  return hydrateOneModel(
    await prisma.vehicleModel.update({
      where: { id },
      data: { ...rest, ...(name ? toColumns(name) : {}) },
    }),
  );
}

export async function deleteModel(id: string): Promise<void> {
  await findModel(id);
  await assertModelDeletable(id);
  await prisma.vehicleModel.update({ where: { id }, data: softDeleteData() });
}

export async function restoreModel(id: string): Promise<AdminVehicleModelDto> {
  const row = await prisma.vehicleModel.findFirst({ where: { id, ...ANY_STATE } });
  if (!row) throw new ApiError(404, MODEL_NOT_FOUND);
  return hydrateOneModel(
    await prisma.vehicleModel.update({ where: { id, ...ANY_STATE }, data: { deletedAt: null } }),
  );
}

// --- Generations ----------------------------------------------------------

const GEN_NOT_FOUND = "نسل خودرو یافت نشد";

interface GenRow {
  id: string;
  modelId: string;
  nameFa: string;
  nameEn: string;
  yearFrom: number;
  yearTo: number | null;
  facelift: boolean;
  deletedAt: Date | null;
}

async function hydrateGenerations(rows: GenRow[]): Promise<AdminVehicleGenDto[]> {
  const ids = rows.map((row) => row.id);
  const [engines, fitments] = await Promise.all([
    countEnginesByGeneration(ids),
    countFitmentsBy("genId", ids),
  ]);
  return rows.map((row) => ({
    id: row.id,
    modelId: row.modelId,
    name: localized(row),
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    facelift: row.facelift,
    engineCount: engines.get(row.id) ?? 0,
    fitmentCount: fitments.get(row.id) ?? 0,
    deletedAt: deletedAtIso(row),
  }));
}

async function hydrateOneGeneration(row: GenRow): Promise<AdminVehicleGenDto> {
  const [dto] = await hydrateGenerations([row]);
  if (!dto) throw new ApiError(404, GEN_NOT_FOUND);
  return dto;
}

async function assertModelExists(modelId: string): Promise<void> {
  const exists = await prisma.vehicleModel.findUnique({
    where: { id: modelId },
    select: { id: true },
  });
  if (!exists) throw new ApiError(400, "مدل انتخاب‌شده یافت نشد");
}

export async function listAdminGenerations(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleGenListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleGenDto>> {
  const where: Where = stateFilter(filters.state);
  if (filters.modelId) where.modelId = filters.modelId;
  const { data, meta } = await paginate<GenRow>(prisma.vehicleGen, "VehicleGen", where, {
    ...pagination,
    sort: pagination.sort ?? "yearFrom",
  });
  return { data: await hydrateGenerations(data), meta };
}

async function findGeneration(id: string): Promise<GenRow> {
  const row = await prisma.vehicleGen.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, GEN_NOT_FOUND);
  return row;
}

export async function createGeneration(input: CreateVehicleGenInput): Promise<AdminVehicleGenDto> {
  await assertModelExists(input.modelId);
  const { name, ...rest } = input;
  return hydrateOneGeneration(
    await prisma.vehicleGen.create({ data: { facelift: false, ...rest, ...toColumns(name) } }),
  );
}

export async function updateGeneration(
  id: string,
  input: CreateVehicleGenInput,
): Promise<AdminVehicleGenDto> {
  await findGeneration(id);
  await assertModelExists(input.modelId);
  const { name, ...rest } = input;
  return hydrateOneGeneration(
    await prisma.vehicleGen.update({
      where: { id },
      data: { facelift: false, ...rest, ...toColumns(name) },
    }),
  );
}

export async function deleteGeneration(id: string): Promise<void> {
  await findGeneration(id);
  await assertGenerationDeletable(id);
  await prisma.vehicleGen.update({ where: { id }, data: softDeleteData() });
}

export async function restoreGeneration(id: string): Promise<AdminVehicleGenDto> {
  const row = await prisma.vehicleGen.findFirst({ where: { id, ...ANY_STATE } });
  if (!row) throw new ApiError(404, GEN_NOT_FOUND);
  return hydrateOneGeneration(
    await prisma.vehicleGen.update({ where: { id, ...ANY_STATE }, data: { deletedAt: null } }),
  );
}

// --- Engines --------------------------------------------------------------

const ENGINE_NOT_FOUND = "موتور یافت نشد";

interface EngineRow {
  id: string;
  genId: string;
  code: string;
  displacement: number;
  fuel: string;
  power: number;
  deletedAt: Date | null;
}

async function hydrateEngines(rows: EngineRow[]): Promise<AdminVehicleEngineDto[]> {
  const fitments = await countFitmentsBy(
    "engineId",
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    genId: row.genId,
    code: row.code,
    displacement: row.displacement,
    fuel: row.fuel as AdminVehicleEngineDto["fuel"],
    power: row.power,
    fitmentCount: fitments.get(row.id) ?? 0,
    deletedAt: deletedAtIso(row),
  }));
}

async function hydrateOneEngine(row: EngineRow): Promise<AdminVehicleEngineDto> {
  const [dto] = await hydrateEngines([row]);
  if (!dto) throw new ApiError(404, ENGINE_NOT_FOUND);
  return dto;
}

async function assertGenerationExists(genId: string): Promise<void> {
  const exists = await prisma.vehicleGen.findUnique({ where: { id: genId }, select: { id: true } });
  if (!exists) throw new ApiError(400, "نسل انتخاب‌شده یافت نشد");
}

export async function listAdminEngines(
  pagination: PaginationQuery,
  filters: Omit<AdminVehicleEngineListQuery, keyof PaginationQuery>,
): Promise<Listed<AdminVehicleEngineDto>> {
  const where: Where = stateFilter(filters.state);
  if (filters.genId) where.genId = filters.genId;
  if (filters.fuel) where.fuel = filters.fuel;
  const { data, meta } = await paginate<EngineRow>(prisma.vehicleEngine, "VehicleEngine", where, {
    ...pagination,
    sort: pagination.sort ?? "code",
  });
  return { data: await hydrateEngines(data), meta };
}

async function findEngine(id: string): Promise<EngineRow> {
  const row = await prisma.vehicleEngine.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, ENGINE_NOT_FOUND);
  return row;
}

export async function createEngine(
  input: CreateVehicleEngineInput,
): Promise<AdminVehicleEngineDto> {
  await assertGenerationExists(input.genId);
  return hydrateOneEngine(await prisma.vehicleEngine.create({ data: input }));
}

export async function updateEngine(
  id: string,
  input: UpdateVehicleEngineInput,
): Promise<AdminVehicleEngineDto> {
  await findEngine(id);
  if (input.genId) await assertGenerationExists(input.genId);
  return hydrateOneEngine(await prisma.vehicleEngine.update({ where: { id }, data: input }));
}

export async function deleteEngine(id: string): Promise<void> {
  await findEngine(id);
  await assertEngineDeletable(id);
  await prisma.vehicleEngine.update({ where: { id }, data: softDeleteData() });
}

export async function restoreEngine(id: string): Promise<AdminVehicleEngineDto> {
  const row = await prisma.vehicleEngine.findFirst({ where: { id, ...ANY_STATE } });
  if (!row) throw new ApiError(404, ENGINE_NOT_FOUND);
  return hydrateOneEngine(
    await prisma.vehicleEngine.update({ where: { id, ...ANY_STATE }, data: { deletedAt: null } }),
  );
}
