import type { AccountType, FitmentConfidence } from "@prisma/client";
import type { ProductListItemDto, VehicleKeyParts } from "schemas";
import { prisma } from "../../config/prisma.js";
import {
  paginate,
  type PaginatedResult,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import { toProductListItem, type ProductRow } from "../catalog/pricing.js";

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
 *
 * The Mongo version tested each optional reference for `$exists: false`
 * *and* `null`, because a document could simply omit the field. A column
 * cannot be absent, so "applies to every generation" has exactly one
 * spelling here: `null`.
 */
function vehicleMatchFilter(vehicle: VehicleKeyParts): Where {
  const engineOr = vehicle.engineId
    ? [{ engineId: null }, { engineId: vehicle.engineId }]
    : [{ engineId: null }];

  return {
    makeId: vehicle.makeId,
    modelId: vehicle.modelId,
    yearFrom: { lte: vehicle.year },
    AND: [
      { OR: [{ genId: null }, { genId: vehicle.genId }] },
      { OR: engineOr },
      { OR: [{ yearTo: null }, { yearTo: { gte: vehicle.year } }] },
    ],
  };
}

interface CandidateRow {
  confidence: FitmentConfidence;
  note: string | null;
  genId: string | null;
  engineId: string | null;
}

/** More specific records (engine-scoped, then generation-scoped) win over
 * broader ones when several technically match the same vehicle. */
function specificity(fitment: CandidateRow): number {
  return (fitment.engineId ? 2 : 0) + (fitment.genId ? 1 : 0);
}

export async function checkFitment(
  productId: string,
  vehicle: VehicleKeyParts,
): Promise<FitmentVerdict> {
  const candidates = (await prisma.fitment.findMany({
    where: { productId, ...vehicleMatchFilter(vehicle) },
    select: { confidence: true, note: true, genId: true, engineId: true },
  })) as CandidateRow[];

  if (candidates.length === 0) {
    return { confidence: null };
  }

  const best = [...candidates].sort((a, b) => specificity(b) - specificity(a))[0]!;
  return { confidence: best.confidence, ...(best.note ? { note: best.note } : {}) };
}

/** Distinct product ids with at least one Fitment record matching this
 * vehicle — shared with modules/catalog's `vehicle=` search/facet filter
 * so both consumers agree on exactly one definition of "fits". */
export async function getFittingProductIds(vehicle: VehicleKeyParts): Promise<string[]> {
  const rows = await prisma.fitment.findMany({
    where: vehicleMatchFilter(vehicle),
    select: { productId: true },
    distinct: ["productId"],
  });
  return rows.map((row) => row.productId);
}

/**
 * `status: "active"` is new, and deliberate. Under Mongo this endpoint
 * filtered on product id alone, so a draft or archived part still appeared
 * in "parts that fit your car" — and then 404'd on its PDP, which does
 * require an active status. Every other public product list already applies
 * the filter (see productFilter.ts); nothing in apps/web consumes this route,
 * so aligning it breaks no caller.
 */
export async function listFittingProducts(
  vehicle: VehicleKeyParts,
  categorySlug: string | undefined,
  pagination: PaginationQuery,
  accountType: AccountType | undefined,
): Promise<PaginatedResult<ProductListItemDto>> {
  const empty = { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
  const productIds = await getFittingProductIds(vehicle);
  if (productIds.length === 0) return empty;

  const where: Where = { id: { in: productIds }, status: "active" };
  if (categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });
    // An unresolvable category slug is treated as "matches nothing" (like
    // any other filter param), not a 404 — this is a list filter, not a
    // single-resource lookup by slug the way GET /catalog/categories/:slug is.
    if (!category) return empty;
    where.categoryId = category.id;
  }

  // Mapped rather than returned raw: Mongoose kept `wholesalePriceRial` off
  // the wire with `select: false`, and Prisma has no such thing — every
  // scalar comes back unless something shapes it. See pricing.ts.
  const { data, meta } = await paginate<ProductRow>(prisma.product, "Product", where, pagination);
  return { data: data.map((row) => toProductListItem(row, accountType)), meta };
}
