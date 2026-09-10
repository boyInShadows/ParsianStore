import type { Coupon } from "@prisma/client";
import {
  DATE_ORDER_MESSAGE,
  PERCENT_RANGE_MESSAGE,
  isDateRangeOrdered,
  isPercentWithinRange,
  type AdminCouponDto,
} from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginatedResult,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
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
 *
 * The usage cap compares two columns of the same row, which under Mongo
 * needed `$expr`. `prisma.coupon.fields.usageLimit` is Prisma's own field
 * reference for exactly this, so it stays a plain `where` rather than raw
 * SQL. A null `usageLimit` makes the comparison null (never true), which
 * is why the `OR` arm for it is still required.
 */
function activeFilter(now: Date): Where {
  return {
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      { OR: [{ usageLimit: null }, { usedCount: { lt: prisma.coupon.fields.usageLimit } }] },
    ],
  };
}

function buildListFilter(
  filters: { type?: string; active?: "true" | "false"; code?: string },
  now: Date,
): Where {
  const where: Where = {};
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.code) {
    // Codes are stored uppercased, so a prefix search must uppercase too.
    // `startsWith` takes the needle as a bound parameter, which retires the
    // hand-escaped `^…` regex the Mongo version needed to stop an admin
    // typing "10%-OFF(" from handing the database a malformed or
    // catastrophically backtracking pattern.
    where.code = { startsWith: normalizeCouponCode(filters.code) };
  }
  if (filters.active === "true") {
    Object.assign(where, activeFilter(now));
  } else if (filters.active === "false") {
    where.NOT = activeFilter(now);
  }
  return where;
}

function toDto(coupon: Coupon): AdminCouponDto {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    ...(coupon.minSubtotalRial === null ? {} : { minSubtotalRial: coupon.minSubtotalRial }),
    ...(coupon.maxDiscountRial === null ? {} : { maxDiscountRial: coupon.maxDiscountRial }),
    ...(coupon.usageLimit === null ? {} : { usageLimit: coupon.usageLimit }),
    usedCount: coupon.usedCount,
    ...(coupon.perUserLimit === null ? {} : { perUserLimit: coupon.perUserLimit }),
    ...(coupon.startsAt ? { startsAt: coupon.startsAt.toISOString() } : {}),
    ...(coupon.endsAt ? { endsAt: coupon.endsAt.toISOString() } : {}),
    createdAt: coupon.createdAt.toISOString(),
  };
}

export async function listAdminCoupons(
  pagination: PaginationQuery,
  filters: { type?: string; active?: "true" | "false"; code?: string },
): Promise<PaginatedResult<AdminCouponDto>> {
  const { data, meta } = await paginate<Coupon>(
    prisma.coupon,
    "Coupon",
    buildListFilter(filters, new Date()),
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
  );
  return { data: data.map(toDto), meta };
}

async function findCouponOrThrow(id: string): Promise<Coupon> {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) {
    throw new ApiError(404, "کد تخفیف یافت نشد");
  }
  return coupon;
}

export async function getAdminCouponById(id: string): Promise<AdminCouponDto> {
  return toDto(await findCouponOrThrow(id));
}

/** Dates arrive as ISO strings on the wire (§9) and are stored as real
 * Dates -- `endsAt: { gt: now }` in `activeFilter` above would compare a
 * string lexically, not chronologically, if this conversion were skipped
 * anywhere. */
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
export async function createCoupon(input: CreateCouponInput): Promise<AdminCouponDto> {
  const created = await prisma.coupon.create({
    data: toStoredFields(input) as Parameters<typeof prisma.coupon.create>[0]["data"],
  });
  return toDto(created);
}

/**
 * Read, merge, then write -- the two cross-field rules are checked here
 * rather than on the PATCH schema because only the merged row has enough
 * information: `{value: 500}` is invalid only if the *stored* coupon is a
 * percent one, and a new `endsAt` must be ordered against the *stored*
 * `startsAt`. See admin-coupon.ts's own note.
 */
export async function updateCoupon(id: string, input: UpdateCouponInput): Promise<AdminCouponDto> {
  const existing = await findCouponOrThrow(id);
  const merged = { ...existing, ...toStoredFields(input) } as Coupon;
  assertCouponRules(merged);
  const updated = await prisma.coupon.update({
    where: { id },
    data: toStoredFields(input) as Parameters<typeof prisma.coupon.update>[0]["data"],
  });
  return toDto(updated);
}

/**
 * Deactivation is an `endsAt` transition, not a new `status` field and
 * not `deletedAt`.
 *
 * `validateCoupon` already rejects any coupon whose `endsAt` has passed,
 * so setting it to now stops the code applying immediately through the
 * one existing, already-tested enforcement path -- rather than adding a
 * second, parallel notion of "off" that every future validation site
 * would have to remember to check. `deletedAt` would be wrong for a
 * different reason: the soft-delete extension would then hide the coupon
 * from this very admin list, destroying the redemption record staff need
 * to audit against past orders.
 */
export function deactivateCoupon(id: string): Promise<AdminCouponDto> {
  return updateCoupon(id, { endsAt: new Date().toISOString() });
}
