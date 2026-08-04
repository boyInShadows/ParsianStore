import { Types, type Model } from "mongoose";
import { toPersianDigits } from "schemas";
import { FitmentModel } from "../../models/Fitment.js";
import { VehicleEngineModel } from "../../models/VehicleEngine.js";
import { VehicleGenModel } from "../../models/VehicleGen.js";
import { VehicleModelModel } from "../../models/VehicleModel.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * P8.S6. Referential-usage counting for the vehicle tree, in one place --
 * the same job catalogUsage.ts does for the catalog taxonomy, and for the
 * same reason: the four vehicle collections had no admin surface at all
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
 * `aggregate` is never covered by the soft-delete query middleware
 * (models/plugins.ts), so every `$match` states `deletedAt: null` itself.
 */

async function countByField<T>(
  model: Model<T>,
  field: string,
  ids: string[],
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await model.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        [field]: { $in: ids.map((id) => new Types.ObjectId(id)) },
        deletedAt: null,
      },
    },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

export function countModelsByMake(makeIds: string[]): Promise<Map<string, number>> {
  return countByField(VehicleModelModel, "makeId", makeIds);
}

export function countGenerationsByModel(modelIds: string[]): Promise<Map<string, number>> {
  return countByField(VehicleGenModel, "modelId", modelIds);
}

export function countEnginesByGeneration(genIds: string[]): Promise<Map<string, number>> {
  return countByField(VehicleEngineModel, "genId", genIds);
}

export type FitmentRefField = "makeId" | "modelId" | "genId" | "engineId";

export function countFitmentsBy(
  field: FitmentRefField,
  ids: string[],
): Promise<Map<string, number>> {
  return countByField(FitmentModel, field, ids);
}

// 409, not 400: a genuine state conflict, matching catalogUsage.ts.
const CONFLICT = 409;

async function assertUnused(
  id: string,
  checks: { count: Promise<Map<string, number>>; message: (count: string) => string }[],
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
