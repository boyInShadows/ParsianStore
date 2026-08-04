import type { FilterQuery, HydratedDocument } from "mongoose";
import type { AdminFitmentDto } from "schemas";
import { FitmentModel, type Fitment } from "../../models/Fitment.js";
import { ProductModel } from "../../models/Product.js";
import { VehicleEngineModel } from "../../models/VehicleEngine.js";
import { VehicleGenModel } from "../../models/VehicleGen.js";
import { VehicleMakeModel } from "../../models/VehicleMake.js";
import { VehicleModelModel } from "../../models/VehicleModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationMeta, type PaginationQuery } from "../../utils/pagination.js";
import type {
  AdminFitmentListQuery,
  CreateFitmentInput,
  UpdateFitmentInput,
} from "./fitment.admin.schema.js";

const NOT_FOUND = "رکورد سازگاری یافت نشد";
const UNKNOWN = "—";

/** See categories.admin.service.ts for why this shape, not `$in: [null, ...]`. */
const ANY_STATE = { deletedAt: { $exists: true } } as const;

type ListFilters = Omit<AdminFitmentListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): FilterQuery<Fitment> {
  const filter: FilterQuery<Fitment> =
    filters.state === "deleted" ? { deletedAt: { $ne: null } } : { deletedAt: null };
  if (filters.productId) filter.productId = filters.productId;
  if (filters.makeId) filter.makeId = filters.makeId;
  if (filters.modelId) filter.modelId = filters.modelId;
  if (filters.genId) filter.genId = filters.genId;
  if (filters.confidence) filter.confidence = filters.confidence;
  return filter;
}

interface Lookups {
  products: Map<string, { name: string; sku: string }>;
  makes: Map<string, string>;
  models: Map<string, string>;
  generations: Map<string, string>;
  engines: Map<string, string>;
}

/**
 * One query per referenced collection for the whole page, not a populate
 * per row -- a page of fitments for one product would otherwise fetch
 * that product twenty times. Every lookup ignores soft-delete state
 * deliberately: a fitment pointing at a since-deleted generation is
 * exactly the broken row staff came here to find, and hiding its name
 * would hide the problem.
 */
async function buildLookups(docs: HydratedDocument<Fitment>[]): Promise<Lookups> {
  const ids = <T>(values: (T | undefined)[]) => [...new Set(values.filter(Boolean).map(String))];

  const [products, makes, models, generations, engines] = await Promise.all([
    ProductModel.find({
      _id: { $in: ids(docs.map((doc) => doc.productId)) },
      ...ANY_STATE,
    }).select("name sku"),
    VehicleMakeModel.find({
      _id: { $in: ids(docs.map((doc) => doc.makeId)) },
      ...ANY_STATE,
    }).select("name"),
    VehicleModelModel.find({
      _id: { $in: ids(docs.map((doc) => doc.modelId)) },
      ...ANY_STATE,
    }).select("name"),
    VehicleGenModel.find({
      _id: { $in: ids(docs.map((doc) => doc.genId)) },
      ...ANY_STATE,
    }).select("name"),
    VehicleEngineModel.find({
      _id: { $in: ids(docs.map((doc) => doc.engineId)) },
      ...ANY_STATE,
    }).select("code"),
  ]);

  return {
    products: new Map(
      products.map((doc) => [String(doc._id), { name: doc.name.fa, sku: doc.sku }]),
    ),
    makes: new Map(makes.map((doc) => [String(doc._id), doc.name.fa])),
    models: new Map(models.map((doc) => [String(doc._id), doc.name.fa])),
    generations: new Map(generations.map((doc) => [String(doc._id), doc.name.fa])),
    engines: new Map(engines.map((doc) => [String(doc._id), doc.code])),
  };
}

function toDto(doc: HydratedDocument<Fitment>, lookups: Lookups): AdminFitmentDto {
  const product = lookups.products.get(String(doc.productId));
  return {
    id: String(doc._id),
    productId: String(doc.productId),
    productName: product?.name ?? UNKNOWN,
    productSku: product?.sku ?? UNKNOWN,
    makeId: String(doc.makeId),
    makeName: lookups.makes.get(String(doc.makeId)) ?? UNKNOWN,
    modelId: String(doc.modelId),
    modelName: lookups.models.get(String(doc.modelId)) ?? UNKNOWN,
    ...(doc.genId
      ? {
          genId: String(doc.genId),
          genName: lookups.generations.get(String(doc.genId)) ?? UNKNOWN,
        }
      : {}),
    ...(doc.engineId
      ? {
          engineId: String(doc.engineId),
          engineCode: lookups.engines.get(String(doc.engineId)) ?? UNKNOWN,
        }
      : {}),
    yearFrom: doc.yearFrom,
    yearTo: doc.yearTo,
    ...(doc.note ? { note: doc.note } : {}),
    confidence: doc.confidence,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  };
}

async function hydrate(docs: HydratedDocument<Fitment>[]): Promise<AdminFitmentDto[]> {
  const lookups = await buildLookups(docs);
  return docs.map((doc) => toDto(doc, lookups));
}

async function hydrateOne(doc: HydratedDocument<Fitment>): Promise<AdminFitmentDto> {
  const [dto] = await hydrate([doc]);
  if (!dto) throw new ApiError(404, NOT_FOUND);
  return dto;
}

/**
 * The vehicle references must be a real chain -- model under make,
 * generation under model, engine under generation. Without this a record
 * can be saved naming a Pride generation under Iran Khodro, which
 * fitment.service.ts's matcher would simply never match: the part would
 * quietly fit no car, with nothing anywhere reporting an error.
 */
async function assertVehicleChain(input: CreateFitmentInput): Promise<void> {
  const product = await ProductModel.exists({ _id: input.productId });
  if (!product) throw new ApiError(400, "محصول انتخاب‌شده یافت نشد");

  const make = await VehicleMakeModel.exists({ _id: input.makeId });
  if (!make) throw new ApiError(400, "برند خودروی انتخاب‌شده یافت نشد");

  const model = await VehicleModelModel.findById(input.modelId);
  if (!model) throw new ApiError(400, "مدل انتخاب‌شده یافت نشد");
  if (String(model.makeId) !== input.makeId) {
    throw new ApiError(400, "مدل انتخاب‌شده زیرمجموعه این برند خودرو نیست");
  }

  if (!input.genId) return;
  const generation = await VehicleGenModel.findById(input.genId);
  if (!generation) throw new ApiError(400, "نسل انتخاب‌شده یافت نشد");
  if (String(generation.modelId) !== input.modelId) {
    throw new ApiError(400, "نسل انتخاب‌شده زیرمجموعه این مدل نیست");
  }

  if (!input.engineId) return;
  const engine = await VehicleEngineModel.findById(input.engineId);
  if (!engine) throw new ApiError(400, "موتور انتخاب‌شده یافت نشد");
  if (String(engine.genId) !== input.genId) {
    throw new ApiError(400, "موتور انتخاب‌شده زیرمجموعه این نسل نیست");
  }
}

export async function listAdminFitments(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminFitmentDto[]; meta: PaginationMeta }> {
  const { data, meta } = await paginate(FitmentModel, buildListFilter(filters), {
    ...pagination,
    sort: pagination.sort ?? "-createdAt",
  });
  return { data: await hydrate(data), meta };
}

export async function getAdminFitmentById(id: string): Promise<AdminFitmentDto> {
  const doc = await FitmentModel.findOne({ _id: id, ...ANY_STATE });
  if (!doc) throw new ApiError(404, NOT_FOUND);
  return hydrateOne(doc);
}

export async function createFitment(input: CreateFitmentInput): Promise<AdminFitmentDto> {
  await assertVehicleChain(input);
  return hydrateOne(await FitmentModel.create(input));
}

export async function updateFitment(
  id: string,
  input: UpdateFitmentInput,
): Promise<AdminFitmentDto> {
  const doc = await FitmentModel.findById(id);
  if (!doc) throw new ApiError(404, NOT_FOUND);
  await assertVehicleChain(input);
  // Every optional field is set explicitly, including to `undefined`.
  // `Object.assign` with an absent key would leave the old value in
  // place -- silently keeping a record engine-scoped after staff
  // deliberately broadened it to every engine.
  doc.set({
    productId: input.productId,
    makeId: input.makeId,
    modelId: input.modelId,
    genId: input.genId,
    engineId: input.engineId,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo,
    note: input.note,
    confidence: input.confidence,
  });
  await doc.save();
  return hydrateOne(doc);
}

/**
 * No usage guard: nothing references a Fitment record, it is itself the
 * reference. Deleting one narrows what the storefront reports as fitting,
 * which is the whole point of the button.
 */
export async function deleteFitment(id: string): Promise<void> {
  const doc = await FitmentModel.findById(id);
  if (!doc) throw new ApiError(404, NOT_FOUND);
  await doc.softDelete();
}

export async function restoreFitment(id: string): Promise<AdminFitmentDto> {
  const doc = await FitmentModel.findOne({ _id: id, ...ANY_STATE });
  if (!doc) throw new ApiError(404, NOT_FOUND);
  doc.deletedAt = null;
  await doc.save();
  return hydrateOne(doc);
}
