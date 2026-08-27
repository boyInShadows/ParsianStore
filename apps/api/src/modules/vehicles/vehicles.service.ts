import type { VehicleGenDto, VehicleMakeDto, VehicleModelDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { localized } from "../../utils/serialize.js";

/**
 * The public vehicle lists feed apps/web's selector cascade (make → model →
 * generation → engine), so each of these returns a DTO rather than the raw row.
 *
 * Under Mongoose these functions returned hydrated documents straight to the
 * controller, which meant `createdAt`, `updatedAt` and `deletedAt` all shipped
 * to the browser as an accident of the toJSON plugin. Mapping explicitly ends
 * that: what the endpoint promises in `packages/schemas` is now exactly what it
 * sends.
 */

interface MakeRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  logo: string | null;
  country: string;
  isDomestic: boolean;
}

interface ModelRow {
  id: string;
  makeId: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  bodyType: string;
}

interface GenRow {
  id: string;
  modelId: string;
  nameFa: string;
  nameEn: string;
  yearFrom: number;
  yearTo: number | null;
  facelift: boolean;
}

interface EngineRow {
  id: string;
  genId: string;
  code: string;
  displacement: number;
  fuel: string;
  power: number;
}

/** Adds the fields the shared DTO does not name but apps/web reads (a make's
 * logo, a model's body type) without also leaking row timestamps. */
export type VehicleMakeListItem = VehicleMakeDto & {
  logo?: string;
  country: string;
  isDomestic: boolean;
};
export type VehicleModelListItem = VehicleModelDto & { bodyType: string };
export type VehicleGenListItem = VehicleGenDto & { facelift: boolean };
export interface VehicleEngineListItem {
  id: string;
  genId: string;
  code: string;
  displacement: number;
  fuel: string;
  power: number;
}

function toMakeDto(row: MakeRow): VehicleMakeListItem {
  return {
    id: row.id,
    name: localized(row),
    slug: row.slug,
    ...(row.logo ? { logo: row.logo } : {}),
    country: row.country,
    isDomestic: row.isDomestic,
  };
}

function toModelDto(row: ModelRow): VehicleModelListItem {
  return {
    id: row.id,
    makeId: row.makeId,
    name: localized(row),
    slug: row.slug,
    bodyType: row.bodyType,
  };
}

function toGenDto(row: GenRow): VehicleGenListItem {
  return {
    id: row.id,
    modelId: row.modelId,
    name: localized(row),
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    facelift: row.facelift,
  };
}

function toEngineDto(row: EngineRow): VehicleEngineListItem {
  return {
    id: row.id,
    genId: row.genId,
    code: row.code,
    displacement: row.displacement,
    fuel: row.fuel,
    power: row.power,
  };
}

export async function listMakes(
  pagination: PaginationQuery,
): Promise<PaginatedResult<VehicleMakeListItem>> {
  const { data, meta } = await paginate<MakeRow>(prisma.vehicleMake, "VehicleMake", {}, pagination);
  return { data: data.map(toMakeDto), meta };
}

export async function listModels(
  makeId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<VehicleModelListItem>> {
  const { data, meta } = await paginate<ModelRow>(
    prisma.vehicleModel,
    "VehicleModel",
    makeId ? { makeId } : {},
    pagination,
  );
  return { data: data.map(toModelDto), meta };
}

export async function listGenerations(
  modelId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<VehicleGenListItem>> {
  const { data, meta } = await paginate<GenRow>(
    prisma.vehicleGen,
    "VehicleGen",
    modelId ? { modelId } : {},
    pagination,
  );
  return { data: data.map(toGenDto), meta };
}

export async function listEngines(
  genId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<VehicleEngineListItem>> {
  const { data, meta } = await paginate<EngineRow>(
    prisma.vehicleEngine,
    "VehicleEngine",
    genId ? { genId } : {},
    pagination,
  );
  return { data: data.map(toEngineDto), meta };
}
