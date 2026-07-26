import { BrandModel, type Brand } from "../../models/Brand.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";
import type { CreateBrandInput, UpdateBrandInput } from "./brands.schema.js";

export function listBrands(
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<Brand>>> {
  return paginate(BrandModel, {}, pagination);
}

export async function getBrandBySlug(slug: string): Promise<HydratedDocument<Brand>> {
  const brand = await BrandModel.findOne({ slug });
  if (!brand) {
    throw new ApiError(404, "برند یافت نشد");
  }
  return brand;
}

export function createBrand(input: CreateBrandInput): Promise<HydratedDocument<Brand>> {
  return BrandModel.create(input);
}

export async function updateBrand(
  id: string,
  input: UpdateBrandInput,
): Promise<HydratedDocument<Brand>> {
  const brand = await BrandModel.findById(id);
  if (!brand) {
    throw new ApiError(404, "برند یافت نشد");
  }
  Object.assign(brand, input);
  await brand.save();
  return brand;
}

export async function deleteBrand(id: string): Promise<void> {
  const brand = await BrandModel.findById(id);
  if (!brand) {
    throw new ApiError(404, "برند یافت نشد");
  }
  await brand.softDelete();
}
