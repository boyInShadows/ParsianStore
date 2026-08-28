import {
  REVENUE_ORDER_STATUSES,
  toEnglishDigits,
  type AdminCustomerDetailDto,
  type AdminCustomerDto,
} from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginatedResult,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import type { SetAccountTypeInput } from "./users.admin.schema.js";

/**
 * A *fragment* search, so `normalizePhone` (§7.5) is deliberately not
 * used here -- it always produces a complete `+98…` number and would
 * turn the partial "0912" into the meaningless "+98912". Staff type
 * whatever part of the number they remember, in Persian or ASCII
 * digits, with or without the country code; all of those must find the
 * same stored `+98…` record, so this reduces both sides to bare
 * national digits and matches on a suffix.
 */
function toNationalDigits(input: string): string {
  const digits = toEnglishDigits(input).replace(/\D/g, "");
  if (digits.startsWith("0098")) return digits.slice(4);
  if (digits.startsWith("98")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function buildListFilter(filters: { phone?: string; accountType?: string }): Where {
  // Staff-only screen: `role: "customer"` keeps staff accounts out of a
  // customer list, matching what the set-account-type script was ever
  // used for. accountType is meaningless on a staff account anyway.
  const where: Where = { role: "customer" };
  if (filters.accountType) {
    where.accountType = filters.accountType;
  }
  const national = filters.phone ? toNationalDigits(filters.phone) : "";
  if (national) {
    // Unanchored substring, deliberately. An anchored match looks
    // reasonable and passes a test written with a trailing fragment, but
    // silently returns nothing for the far more common case of staff
    // typing the *start* of a number ("0912…").
    //
    // `contains` also retires the hand-built `$regex`: the fragment is a
    // bound parameter now, so there is nothing to escape -- previously the
    // safety rested entirely on `toNationalDigits` having stripped every
    // character a pattern could be built from.
    where.phone = { contains: national };
  }
  return where;
}

/**
 * Only what the customers screen renders.
 *
 * Under Mongoose this was a `select` string and `passwordHash` was
 * `select: false` on the model, so the hash was never at risk and this was
 * only about not over-sending PII. Prisma has no model-level exclusion:
 * every scalar comes back unless a `select` says otherwise, so the same
 * narrowing is now what keeps the staff password hash off an admin list
 * as well.
 */
const CUSTOMER_LIST_COLUMNS = {
  id: true,
  phone: true,
  name: true,
  role: true,
  accountType: true,
  createdAt: true,
} as const;

interface CustomerRow {
  id: string;
  phone: string;
  name: string;
  role: string;
  accountType: AdminCustomerDto["accountType"];
  createdAt: Date;
}

function toCustomerDto(row: CustomerRow): AdminCustomerDto {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    role: row.role,
    accountType: row.accountType,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAdminCustomers(
  pagination: PaginationQuery,
  filters: { phone?: string; accountType?: string },
): Promise<PaginatedResult<AdminCustomerDto>> {
  const { data, meta } = await paginate<CustomerRow>(
    prisma.user,
    "User",
    buildListFilter(filters),
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
    { select: CUSTOMER_LIST_COLUMNS },
  );
  return { data: data.map(toCustomerDto), meta };
}

export async function getAdminCustomerById(id: string): Promise<AdminCustomerDto> {
  const user = await prisma.user.findUnique({ where: { id }, select: CUSTOMER_LIST_COLUMNS });
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  return toCustomerDto(user);
}

// P8.S7 -- the detail view. --------------------------------------------

const RECENT_ORDER_LIMIT = 10;
const UNKNOWN = "—";

/**
 * Order totals for one customer.
 *
 * Was a `$group` aggregation pipeline; `aggregate` says the same thing in
 * one call. Worth reading the `deletedAt` filter: under Mongo the
 * aggregation framework bypassed the soft-delete middleware, so the
 * pipeline had to repeat the condition by hand. Here the client extension
 * does reach `aggregate` and `count`, so the filter is applied for us --
 * the explicit `deletedAt: null` is gone rather than merely tidied away.
 */
async function orderStatsFor(userId: string): Promise<{
  stats: AdminCustomerDetailDto["stats"];
  recentOrders: AdminCustomerDetailDto["recentOrders"];
}> {
  const [totals, openOrderCount, recent] = await Promise.all([
    prisma.order.aggregate({
      where: { userId, status: { in: [...REVENUE_ORDER_STATUSES] } },
      _count: { _all: true },
      _sum: { totalRial: true },
      _max: { createdAt: true },
    }),
    prisma.order.count({ where: { userId, status: { in: ["pending", "processing"] } } }),
    prisma.order.findMany({
      where: { userId },
      select: { id: true, code: true, status: true, totalRial: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: RECENT_ORDER_LIMIT,
    }),
  ]);

  const orderCount = totals._count._all;
  const lifetimeValueRial = totals._sum.totalRial ?? 0;
  return {
    stats: {
      orderCount,
      lifetimeValueRial,
      averageOrderRial: orderCount === 0 ? 0 : Math.round(lifetimeValueRial / orderCount),
      lastOrderAt: totals._max.createdAt ? totals._max.createdAt.toISOString() : null,
      openOrderCount,
    },
    recentOrders: recent.map((order) => ({
      id: order.id,
      code: order.code,
      status: order.status,
      totalRial: order.totalRial,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

/**
 * Addresses and garage entries are tables now, not embedded arrays, which
 * turns six lookup queries and six Maps into two joins.
 *
 * The relation filters spell out `deletedAt: null` on the vehicle rows
 * because the soft-delete extension does not reach nested reads (see
 * config/prisma.ts) -- and here that blind spot would be wrong rather than
 * useful: a garage entry pointing at a retired generation should read as
 * unknown, the way it did when the Mongo lookup could not find it either.
 */
const DETAIL_RELATIONS = {
  addresses: {
    select: {
      id: true,
      line: true,
      postalCode: true,
      plate: true,
      unit: true,
      receiverName: true,
      receiverPhone: true,
      province: { select: { nameFa: true, deletedAt: true } },
      city: { select: { nameFa: true, deletedAt: true } },
    },
  },
  garage: {
    select: {
      id: true,
      year: true,
      nickname: true,
      make: { select: { nameFa: true, deletedAt: true } },
      model: { select: { nameFa: true, deletedAt: true } },
      gen: { select: { nameFa: true, deletedAt: true } },
    },
  },
} as const;

/** A soft-deleted reference reads as unknown, not as a name. */
function liveName(ref: { nameFa: string; deletedAt: Date | null } | null): string {
  return ref && ref.deletedAt === null ? ref.nameFa : UNKNOWN;
}

export async function getAdminCustomerDetail(id: string): Promise<AdminCustomerDetailDto> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: DETAIL_RELATIONS,
  });
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }

  const orderData = await orderStatsFor(user.id);

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    accountType: user.accountType,
    createdAt: user.createdAt.toISOString(),
    ...(user.email ? { email: user.email } : {}),
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    walletBalanceRial: user.walletBalanceRial,
    stats: orderData.stats,
    addresses: user.addresses.map((address) => ({
      id: address.id,
      province: liveName(address.province),
      city: liveName(address.city),
      line: address.line,
      postalCode: address.postalCode,
      ...(address.plate ? { plate: address.plate } : {}),
      ...(address.unit ? { unit: address.unit } : {}),
      receiverName: address.receiverName,
      receiverPhone: address.receiverPhone,
    })),
    garage: user.garage.map((entry) => ({
      // A real row id now. The Mongo version had to synthesise
      // `${userId}-${index}` because the embedded sub-document declared no
      // `_id` in its interface.
      id: entry.id,
      make: liveName(entry.make),
      model: liveName(entry.model),
      generation: liveName(entry.gen),
      year: entry.year,
      ...(entry.nickname ? { nickname: entry.nickname } : {}),
    })),
    recentOrders: orderData.recentOrders,
  };
}

/**
 * The UI equivalent of `pnpm --filter api set-account-type <phone>
 * <retail|wholesale>` (P6.S1's sanctioned mechanism), with one real
 * behavioural difference worth knowing: `accountType` is baked into the
 * JWT access token at issue time (`utils/jwt.ts`), so a flag flipped
 * here does not change what that customer is charged until their token
 * next refreshes. The admin UI says so out loud rather than implying
 * the new price is live immediately.
 */
export async function setAccountType(
  id: string,
  input: SetAccountTypeInput,
): Promise<AdminCustomerDto> {
  const user = await getAdminCustomerById(id);
  if (user.role !== "customer") {
    throw new ApiError(400, "نوع حساب فقط برای مشتریان قابل تغییر است");
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { accountType: input.accountType },
    select: CUSTOMER_LIST_COLUMNS,
  });
  return toCustomerDto(updated);
}
