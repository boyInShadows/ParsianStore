import type { FilterQuery, HydratedDocument } from "mongoose";
import {
  DATE_ORDER_MESSAGE,
  PERCENT_RANGE_MESSAGE,
  isDateRangeOrdered,
  isPercentWithinRange,
} from "schemas";
import { CouponModel, type Coupon } from "../../models/Coupon.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { escapeRegExp } from "../../utils/regex.js";
import { normalizeCouponCode } from "./coupon.service.js";
import type { CreateCouponInput, UpdateCouponInput } from "./coupons.admin.schema.js";

/**
 * "Currently usable" expressed as a query, mirroring exactly the first,
 * second and fourth checks `coupon.service.ts`'s own `validateCoupon`
 * performs -- the date window and the global usage cap. The two
 * remaining checks it makes (minSubtotalRial, perUserLimit) are
 * deliberately absent: both depend on a specific cart or a specific
 * shopper, so neither is a property of the coupon alone and neither
 * could honestly be answered on a list screen.
 */
function activeFilter(now: Date): FilterQuery<Coupon> {
  return {
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      { $or: [{ usageLimit: null }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
    ],
  };
}

function buildListFilter(
  filters: { type?: string; active?: "true" | "false"; code?: string },
  now: Date,
): FilterQuery<Coupon> {
  const filter: FilterQuery<Coupon> = {};
  if (filters.type) {
    filter.type = filters.type;
  }
  if (filters.code) {
    // Codes are stored uppercased, so a prefix search must uppercase too.
    // Escaped before it reaches the regex: an admin typing "10%-OFF(" must
    // not be able to hand MongoDB a malformed or catastrophically
    // backtracking pattern.
    const escaped = escapeRegExp(normalizeCouponCode(filters.code));
    filter.code = { $regex: `^${escaped}` };
  }
  if (filters.active === "true") {
    Object.assign(filter, activeFilter(now));
  } else if (filters.active === "false") {
    filter.$nor = [activeFilter(now)];
  }
  return filter;
}

export function listAdminCoupons(
  pagination: PaginationQuery,
  filters: { type?: string; active?: "true" | "false"; code?: string },
): Promise<PaginatedResult<HydratedDocument<Coupon>>> {
  return paginate(CouponModel, buildListFilter(filters, new Date()), {
    ...pagination,
    sort: pagination.sort ?? "-createdAt",
  });
}

export async function getAdminCouponById(id: string): Promise<HydratedDocument<Coupon>> {
  const coupon = await CouponModel.findById(id);
  if (!coupon) {
    throw new ApiError(404, "کد تخفیف یافت نشد");
  }
  return coupon;
}

/** Dates arrive as ISO strings on the wire (§9) and are stored as real
 * Dates -- `endsAt: { $gt: now }` in `activeFilter` above would compare
 * a string lexically, not chronologically, if this conversion were
 * skipped anywhere. */
function toStoredFields(input: CreateCouponInput | UpdateCouponInput): Record<string, unknown> {
  const { code, startsAt, endsAt, ...rest } = input;
  return {
    ...rest,
    ...(code !== undefined ? { code: normalizeCouponCode(code) } : {}),
    ...(startsAt !== undefined ? { startsAt: new Date(startsAt) } : {}),
    ...(endsAt !== undefined ? { endsAt: new Date(endsAt) } : {}),
  };
}

/** Re-checks, against a whole coupon, the same two rules
 * `adminCreateCouponInputSchema` enforces on a complete create body.
 * Shares the predicates rather than restating the conditions, so the
 * two can never drift apart. */
function assertCouponRules(coupon: Pick<Coupon, "type" | "value" | "startsAt" | "endsAt">): void {
  const asRuleFields = {
    type: coupon.type,
    value: coupon.value,
    startsAt: coupon.startsAt?.toISOString(),
    endsAt: coupon.endsAt?.toISOString(),
  };
  if (!isPercentWithinRange(asRuleFields)) {
    throw new ApiError(400, PERCENT_RANGE_MESSAGE);
  }
  if (!isDateRangeOrdered(asRuleFields)) {
    throw new ApiError(400, DATE_ORDER_MESSAGE);
  }
}

/** A duplicate `code` surfaces as a clean 400 through the shared
 * duplicate-key branch P8.S2 added to `middleware/error.ts`, not a raw
 * 500 -- no local try/catch needed here. */
export function createCoupon(input: CreateCouponInput): Promise<HydratedDocument<Coupon>> {
  return CouponModel.create(toStoredFields(input));
}

/** Fetch-then-`.save()`, the convention every admin service in this
 * codebase follows (products.admin.service.ts documents the real bug
 * `findOneAndUpdate` caused once by skipping document middleware).
 *
 * The two cross-field rules are checked here rather than on the PATCH
 * schema because only the merged document has enough information:
 * `{value: 500}` is invalid only if the *stored* coupon is a percent
 * one, and a new `endsAt` must be ordered against the *stored*
 * `startsAt`. See admin-coupon.ts's own note. */
export async function updateCoupon(
  id: string,
  input: UpdateCouponInput,
): Promise<HydratedDocument<Coupon>> {
  const coupon = await getAdminCouponById(id);
  Object.assign(coupon, toStoredFields(input));
  assertCouponRules(coupon);
  await coupon.save();
  return coupon;
}

/**
 * Deactivation is an `endsAt` transition, not a new `status` field and
 * not the soft-delete plugin's `deletedAt`.
 *
 * `validateCoupon` already rejects any coupon whose `endsAt` has passed,
 * so setting it to now stops the code applying immediately through the
 * one existing, already-tested enforcement path -- rather than adding a
 * second, parallel notion of "off" that every future validation site
 * would have to remember to check. `deletedAt` would be wrong for a
 * different reason: the soft-delete plugin's own `pre(/^find/)` filter
 * would then hide the coupon from this very admin list, destroying the
 * redemption record staff need to audit against past orders.
 */
export function deactivateCoupon(id: string): Promise<HydratedDocument<Coupon>> {
  return updateCoupon(id, { endsAt: new Date().toISOString() });
}
