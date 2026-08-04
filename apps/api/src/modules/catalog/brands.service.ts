import { BrandModel, type Brand } from "../../models/Brand.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";

// Shopper reads only — every write plus the admin-shaped reads, the delete
// guard and restore live in brands.admin.service.ts as of P8.S4.

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
