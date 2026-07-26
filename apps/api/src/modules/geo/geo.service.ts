import { CityModel } from "../../models/City.js";
import { ProvinceModel } from "../../models/Province.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";
import type { City } from "../../models/City.js";
import type { Province } from "../../models/Province.js";

export function listProvinces(
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<Province>>> {
  return paginate(ProvinceModel, {}, pagination);
}

export function listCities(
  provinceId: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<City>>> {
  return paginate(CityModel, provinceId ? { provinceId } : {}, pagination);
}
