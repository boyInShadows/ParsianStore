import { VehicleEngineModel } from "../../models/VehicleEngine.js";
import { VehicleGenModel } from "../../models/VehicleGen.js";
import { VehicleMakeModel } from "../../models/VehicleMake.js";
import { VehicleModelModel } from "../../models/VehicleModel.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";
import type { VehicleEngine } from "../../models/VehicleEngine.js";
import type { VehicleGen } from "../../models/VehicleGen.js";
import type { VehicleMake } from "../../models/VehicleMake.js";
import type { VehicleModel } from "../../models/VehicleModel.js";

export function listMakes(
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<VehicleMake>>> {
  return paginate(VehicleMakeModel, {}, pagination);
}

export function listModels(
  makeId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<VehicleModel>>> {
  return paginate(VehicleModelModel, makeId ? { makeId } : {}, pagination);
}

export function listGenerations(
  modelId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<VehicleGen>>> {
  return paginate(VehicleGenModel, modelId ? { modelId } : {}, pagination);
}

export function listEngines(
  genId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<VehicleEngine>>> {
  return paginate(VehicleEngineModel, genId ? { genId } : {}, pagination);
}
