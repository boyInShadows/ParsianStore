import { Prisma } from "@prisma/client";
import type { AdminFitmentDto } from "schemas";
import { ANY_STATE, prisma, softDeleteData, stateFilter } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginatableDelegate,
  type PaginationMeta,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import type {
  AdminFitmentListQuery,
  CreateFitmentInput,
  UpdateFitmentInput,
} from "./fitment.admin.schema.js";

const NOT_FOUND = "رکورد سازگاری یافت نشد";
const UNKNOWN = "—";

type ListFilters = Omit<AdminFitmentListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): Where {
  return {
    ...stateFilter(filters.state),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.makeId ? { makeId: filters.makeId } : {}),
    ...(filters.modelId ? { modelId: filters.modelId } : {}),
    ...(filters.genId ? { genId: filters.genId } : {}),
    ...(filters.confidence ? { confidence: filters.confidence } : {}),
  };
}

/**
 * The referenced names, joined in the same query as the row itself.
 *
 * Under Mongo this was five extra `find({ _id: { $in: [...] } })` calls plus a
 * Map per collection, because a `populate` per row would have refetched the
 * same product twenty times on a page of fitments for one product. A foreign
 * key makes that plumbing unnecessary -- and it also makes the deliberate part
 * work by itself: these lookups must ignore soft-delete state, since a fitment
 * pointing at a since-deleted generation is exactly the broken row staff came
 * here to find, and blanking its name would hide the problem. Prisma query
 * extensions do not reach nested reads (see config/prisma.ts), so an `include`
 * returns the related row whatever its `deletedAt` -- the old ANY_STATE
 * behaviour, for free rather than by hand.
 */
const REFERENCES = {
  product: { select: { nameFa: true, sku: true } },
  make: { select: { nameFa: true } },
  model: { select: { nameFa: true } },
  gen: { select: { nameFa: true } },
  engine: { select: { code: true } },
} as const;

/**
 * Derived from the schema rather than hand-written: `GetPayload` reads the
 * model and the `include` above, so a renamed column or a changed relation is
 * a compile error here instead of an `undefined` in the admin table.
 */
type FitmentRow = Prisma.FitmentGetPayload<{ include: typeof REFERENCES }>;

function toDto(row: FitmentRow): AdminFitmentDto {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product?.nameFa ?? UNKNOWN,
    productSku: row.product?.sku ?? UNKNOWN,
    makeId: row.makeId,
    makeName: row.make?.nameFa ?? UNKNOWN,
    modelId: row.modelId,
    modelName: row.model?.nameFa ?? UNKNOWN,
    ...(row.genId ? { genId: row.genId, genName: row.gen?.nameFa ?? UNKNOWN } : {}),
    ...(row.engineId ? { engineId: row.engineId, engineCode: row.engine?.code ?? UNKNOWN } : {}),
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    ...(row.note ? { note: row.note } : {}),
    confidence: row.confidence,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

/**
 * The vehicle references must be a real chain -- model under make, generation
 * under model, engine under generation. The foreign keys now guarantee each id
 * *exists*; they cannot say anything about whether the four belong together.
 * Without this check a record can still be saved naming a Pride generation
 * under Iran Khodro, which fitment.service.ts's matcher would simply never
 * match: the part would quietly fit no car, with nothing anywhere reporting an
 * error.
 */
async function assertVehicleChain(input: CreateFitmentInput): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) throw new ApiError(400, "محصول انتخاب‌شده یافت نشد");

  const make = await prisma.vehicleMake.findUnique({
    where: { id: input.makeId },
    select: { id: true },
  });
  if (!make) throw new ApiError(400, "برند خودروی انتخاب‌شده یافت نشد");

  const model = await prisma.vehicleModel.findUnique({
    where: { id: input.modelId },
    select: { makeId: true },
  });
  if (!model) throw new ApiError(400, "مدل انتخاب‌شده یافت نشد");
  if (model.makeId !== input.makeId) {
    throw new ApiError(400, "مدل انتخاب‌شده زیرمجموعه این برند خودرو نیست");
  }

  if (!input.genId) return;
  const generation = await prisma.vehicleGen.findUnique({
    where: { id: input.genId },
    select: { modelId: true },
  });
  if (!generation) throw new ApiError(400, "نسل انتخاب‌شده یافت نشد");
  if (generation.modelId !== input.modelId) {
    throw new ApiError(400, "نسل انتخاب‌شده زیرمجموعه این مدل نیست");
  }

  if (!input.engineId) return;
  const engine = await prisma.vehicleEngine.findUnique({
    where: { id: input.engineId },
    select: { genId: true },
  });
  if (!engine) throw new ApiError(400, "موتور انتخاب‌شده یافت نشد");
  if (engine.genId !== input.genId) {
    throw new ApiError(400, "موتور انتخاب‌شده زیرمجموعه این نسل نیست");
  }
}

/** The write payload, spelled out once for create and update alike. */
function writeData(input: CreateFitmentInput) {
  return {
    productId: input.productId,
    makeId: input.makeId,
    modelId: input.modelId,
    genId: input.genId ?? null,
    engineId: input.engineId ?? null,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo ?? null,
    note: input.note ?? null,
    confidence: input.confidence,
  };
}

export async function listAdminFitments(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminFitmentDto[]; meta: PaginationMeta }> {
  const { data, meta } = await paginate<FitmentRow>(
    // `include` changes what `findMany` returns, but the generated delegate
    // type only advertises the bare-column shape until it sees the argument
    // object -- so the row type has to be asserted here. It is derived from
    // the schema (above), not written by hand, so it cannot drift from it.
    prisma.fitment as unknown as PaginatableDelegate<FitmentRow>,
    "Fitment",
    buildListFilter(filters),
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
    { include: REFERENCES },
  );
  return { data: data.map(toDto), meta };
}

/** Live or soft-deleted -- what the detail view and restore have to find. */
async function findAnyState(id: string): Promise<FitmentRow> {
  const row = (await prisma.fitment.findFirst({
    where: { id, ...ANY_STATE },
    include: REFERENCES,
  })) as FitmentRow | null;
  if (!row) throw new ApiError(404, NOT_FOUND);
  return row;
}

export async function getAdminFitmentById(id: string): Promise<AdminFitmentDto> {
  return toDto(await findAnyState(id));
}

export async function createFitment(input: CreateFitmentInput): Promise<AdminFitmentDto> {
  await assertVehicleChain(input);
  const row = (await prisma.fitment.create({
    data: writeData(input),
    include: REFERENCES,
  })) as FitmentRow;
  return toDto(row);
}

export async function updateFitment(
  id: string,
  input: UpdateFitmentInput,
): Promise<AdminFitmentDto> {
  const existing = await prisma.fitment.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ApiError(404, NOT_FOUND);
  await assertVehicleChain(input);
  // Every optional field is written explicitly, including as null. Omitting an
  // absent key would leave the old value in place -- silently keeping a record
  // engine-scoped after staff deliberately broadened it to every engine. Under
  // Mongoose the same trap needed `doc.set()` over a full object rather than
  // `Object.assign`.
  const row = (await prisma.fitment.update({
    where: { id },
    data: writeData(input),
    include: REFERENCES,
  })) as FitmentRow;
  return toDto(row);
}

/**
 * No usage guard: nothing references a Fitment record, it is itself the
 * reference. Deleting one narrows what the storefront reports as fitting,
 * which is the whole point of the button.
 */
export async function deleteFitment(id: string): Promise<void> {
  const existing = await prisma.fitment.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ApiError(404, NOT_FOUND);
  await prisma.fitment.update({ where: { id }, data: softDeleteData() });
}

export async function restoreFitment(id: string): Promise<AdminFitmentDto> {
  await findAnyState(id);
  const row = (await prisma.fitment.update({
    where: { id, ...ANY_STATE },
    data: { deletedAt: null },
    include: REFERENCES,
  })) as FitmentRow;
  return toDto(row);
}
