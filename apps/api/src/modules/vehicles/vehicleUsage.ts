import { toPersianDigits } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * P8.S6. Referential-usage counting for the vehicle tree, in one place --
 * the same job catalogUsage.ts does for the catalog taxonomy, and for the
 * same reason: the four vehicle tables had no admin surface at all
 * before this step, so nothing ever asked whether a make/model/generation
 * was still referenced.
 *
 * Two references matter and they are NOT the same thing:
 *
 * 1. Children in the tree (a make's models, a model's generations, a
 *    generation's engines). Deleting the parent would orphan them.
 * 2. Fitment records. Those are what /fitment/check and the vehicle-
 *    filtered PLP actually run on, and Fitment stores makeId/modelId/
 *    genId/engineId as flat refs -- a deleted generation leaves the
 *    fitment silently matching nothing, which reads on the storefront as
 *    "this part fits no car" rather than as an error.
 *
 * The `deletedAt: null` filter is no longer written out here. Under Mongoose
 * these were `aggregate` pipelines, which query middleware never covered, so
 * each `$match` had to state it. Prisma's `groupBy` *is* covered by the
 * soft-delete client extension (config/prisma.ts), so stating it again would
 * be duplicate, and duplicating an invariant is how the two copies drift.
 */

type Counted = Map<string, number>;

function tally(rows: { _count: number; key: string | null }[]): Counted {
  return new Map(rows.filter((row) => row.key !== null).map((row) => [row.key!, row._count]));
}

export async function countModelsByMake(makeIds: string[]): Promise<Counted> {
  if (makeIds.length === 0) return new Map();
  const rows = await prisma.vehicleModel.groupBy({
    by: ["makeId"],
    where: { makeId: { in: makeIds } },
    _count: true,
  });
  return tally(rows.map((row) => ({ key: row.makeId, _count: row._count })));
}

export async function countGenerationsByModel(modelIds: string[]): Promise<Counted> {
  if (modelIds.length === 0) return new Map();
  const rows = await prisma.vehicleGen.groupBy({
    by: ["modelId"],
    where: { modelId: { in: modelIds } },
    _count: true,
  });
  return tally(rows.map((row) => ({ key: row.modelId, _count: row._count })));
}

export async function countEnginesByGeneration(genIds: string[]): Promise<Counted> {
  if (genIds.length === 0) return new Map();
  const rows = await prisma.vehicleEngine.groupBy({
    by: ["genId"],
    where: { genId: { in: genIds } },
    _count: true,
  });
  return tally(rows.map((row) => ({ key: row.genId, _count: row._count })));
}

export type FitmentRefField = "makeId" | "modelId" | "genId" | "engineId";

/**
 * Written as four literal branches rather than one dynamic `by: [field]`
 * because Prisma's `groupBy` types the result from the grouping key: a
 * computed key erases that and needs a cast to get back, which is exactly the
 * kind of cast that stops the compiler noticing a renamed column.
 */
export async function countFitmentsBy(field: FitmentRefField, ids: string[]): Promise<Counted> {
  if (ids.length === 0) return new Map();
  switch (field) {
    case "makeId": {
      const rows = await prisma.fitment.groupBy({
        by: ["makeId"],
        where: { makeId: { in: ids } },
        _count: true,
      });
      return tally(rows.map((row) => ({ key: row.makeId, _count: row._count })));
    }
    case "modelId": {
      const rows = await prisma.fitment.groupBy({
        by: ["modelId"],
        where: { modelId: { in: ids } },
        _count: true,
      });
      return tally(rows.map((row) => ({ key: row.modelId, _count: row._count })));
    }
    case "genId": {
      const rows = await prisma.fitment.groupBy({
        by: ["genId"],
        where: { genId: { in: ids } },
        _count: true,
      });
      return tally(rows.map((row) => ({ key: row.genId, _count: row._count })));
    }
    case "engineId": {
      const rows = await prisma.fitment.groupBy({
        by: ["engineId"],
        where: { engineId: { in: ids } },
        _count: true,
      });
      return tally(rows.map((row) => ({ key: row.engineId, _count: row._count })));
    }
  }
}

// 409, not 400: a genuine state conflict, matching catalogUsage.ts.
const CONFLICT = 409;

async function assertUnused(
  id: string,
  checks: { count: Promise<Counted>; message: (count: string) => string }[],
): Promise<void> {
  for (const check of checks) {
    const count = (await check.count).get(id) ?? 0;
    if (count > 0) {
      throw new ApiError(CONFLICT, check.message(toPersianDigits(count)));
    }
  }
}

export function assertMakeDeletable(makeId: string): Promise<void> {
  return assertUnused(makeId, [
    {
      count: countModelsByMake([makeId]),
      message: (n) => `${n} مدل زیر این برند خودرو قرار دارد؛ ابتدا آن‌ها را حذف یا جابه‌جا کنید`,
    },
    {
      count: countFitmentsBy("makeId", [makeId]),
      message: (n) => `${n} رکورد سازگاری به این برند خودرو متصل است؛ ابتدا آن‌ها را حذف کنید`,
    },
  ]);
}

export function assertModelDeletable(modelId: string): Promise<void> {
  return assertUnused(modelId, [
    {
      count: countGenerationsByModel([modelId]),
      message: (n) => `${n} نسل زیر این مدل قرار دارد؛ ابتدا آن‌ها را حذف کنید`,
    },
    {
      count: countFitmentsBy("modelId", [modelId]),
      message: (n) => `${n} رکورد سازگاری به این مدل متصل است؛ ابتدا آن‌ها را حذف کنید`,
    },
  ]);
}

export function assertGenerationDeletable(genId: string): Promise<void> {
  return assertUnused(genId, [
    {
      count: countEnginesByGeneration([genId]),
      message: (n) => `${n} موتور زیر این نسل قرار دارد؛ ابتدا آن‌ها را حذف کنید`,
    },
    {
      count: countFitmentsBy("genId", [genId]),
      message: (n) => `${n} رکورد سازگاری به این نسل متصل است؛ ابتدا آن‌ها را حذف کنید`,
    },
  ]);
}

export function assertEngineDeletable(engineId: string): Promise<void> {
  return assertUnused(engineId, [
    {
      count: countFitmentsBy("engineId", [engineId]),
      message: (n) => `${n} رکورد سازگاری به این موتور متصل است؛ ابتدا آن‌ها را حذف کنید`,
    },
  ]);
}
