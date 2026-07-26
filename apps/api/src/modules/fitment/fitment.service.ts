import { Types, type FilterQuery, type HydratedDocument } from "mongoose";
import type { VehicleKeyParts } from "schemas";
import { CategoryModel } from "../../models/Category.js";
import { FitmentModel, type Fitment, type FitmentConfidence } from "../../models/Fitment.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";

export interface FitmentVerdict {
  // null = no fitment record exists at all — §3.4 renders this the same
  // neutral way as "check", but the Fitment Manager's coverage report
  // (§3.7) needs to tell the two apart, so the API keeps them distinct.
  confidence: FitmentConfidence | null;
  note?: string;
}

/**
 * A record matches a vehicle when: make/model match exactly; its genId is
 * either unset (applies to every generation) or equals the vehicle's;
 * its engineId is either unset (applies to every engine) or equals the
 * vehicle's *if the vehicle even specifies one* (an engine-specific
 * record can't match a vehicle with no engine selected); and the
 * vehicle's year falls inside [yearFrom, yearTo], where a null yearTo
 * means "still in production" (mirrors VehicleGen.yearTo).
 */
function vehicleMatchFilter(vehicle: VehicleKeyParts): FilterQuery<Fitment> {
  const genOr = [
    { genId: { $exists: false } },
    { genId: null },
    { genId: new Types.ObjectId(vehicle.genId) },
  ];
  const engineOr = vehicle.engineId
    ? [
        { engineId: { $exists: false } },
        { engineId: null },
        { engineId: new Types.ObjectId(vehicle.engineId) },
      ]
    : [{ engineId: { $exists: false } }, { engineId: null }];

  return {
    makeId: new Types.ObjectId(vehicle.makeId),
    modelId: new Types.ObjectId(vehicle.modelId),
    yearFrom: { $lte: vehicle.year },
    $and: [
      { $or: genOr },
      { $or: engineOr },
      { $or: [{ yearTo: null }, { yearTo: { $gte: vehicle.year } }] },
    ],
  };
}

/** More specific records (engine-scoped, then generation-scoped) win over
 * broader ones when several technically match the same vehicle. */
function specificity(fitment: HydratedDocument<Fitment>): number {
  return (fitment.engineId ? 2 : 0) + (fitment.genId ? 1 : 0);
}

export async function checkFitment(
  productId: string,
  vehicle: VehicleKeyParts,
): Promise<FitmentVerdict> {
  const candidates = await FitmentModel.find({
    productId: new Types.ObjectId(productId),
    ...vehicleMatchFilter(vehicle),
  });

  if (candidates.length === 0) {
    return { confidence: null };
  }

  const best = [...candidates].sort((a, b) => specificity(b) - specificity(a))[0]!;
  return { confidence: best.confidence, note: best.note };
}

export async function listFittingProducts(
  vehicle: VehicleKeyParts,
  categorySlug: string | undefined,
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<Product>>> {
  const fitments = await FitmentModel.find(vehicleMatchFilter(vehicle)).select("productId");
  const productIds = [...new Set(fitments.map((f) => f.productId.toString()))];

  if (productIds.length === 0) {
    return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
  }

  const filter: FilterQuery<Product> = { _id: { $in: productIds } };
  if (categorySlug) {
    const category = await CategoryModel.findOne({ slug: categorySlug });
    // An unresolvable category slug is treated as "matches nothing" (like
    // any other filter param), not a 404 — this is a list filter, not a
    // single-resource lookup by slug the way GET /catalog/categories/:slug is.
    if (!category) {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
    filter.categoryId = category._id;
  }

  return paginate(ProductModel, filter, pagination);
}
