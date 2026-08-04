import type { FilterQuery, HydratedDocument, Types } from "mongoose";
import { REVENUE_ORDER_STATUSES, toEnglishDigits, type AdminCustomerDetailDto } from "schemas";
import { CityModel } from "../../models/City.js";
import { OrderModel } from "../../models/Order.js";
import { ProvinceModel } from "../../models/Province.js";
import { UserModel, type User } from "../../models/User.js";
import { VehicleGenModel } from "../../models/VehicleGen.js";
import { VehicleMakeModel } from "../../models/VehicleMake.js";
import { VehicleModelModel } from "../../models/VehicleModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
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

function buildListFilter(filters: { phone?: string; accountType?: string }): FilterQuery<User> {
  // Staff-only screen: `role: "customer"` keeps staff accounts out of a
  // customer list, matching what the set-account-type script was ever
  // used for. accountType is meaningless on a staff account anyway.
  const filter: FilterQuery<User> = { role: "customer" };
  if (filters.accountType) {
    filter.accountType = filters.accountType;
  }
  const national = filters.phone ? toNationalDigits(filters.phone) : "";
  if (national) {
    // Unanchored substring, deliberately. An anchored `${national}$`
    // looks reasonable and passes a test written with a trailing
    // fragment, but silently returns nothing for the far more common
    // case of staff typing the *start* of a number ("0912…") -- found
    // by running a real query against the seeded database, not by the
    // unit tests. `toNationalDigits` has already stripped every
    // non-digit, so no regex metacharacter can survive into this
    // pattern.
    filter.phone = { $regex: national };
  }
  return filter;
}

// Only what the customers screen renders. Without this the endpoint
// ships the whole user document -- addresses, garage, wallet balance,
// login timestamps -- none of which this screen shows, and all of which
// is needless PII on the wire. (`passwordHash` is already `select:
// false` on the model, so it was never at risk; this is about not
// over-sending everything else.)
const CUSTOMER_LIST_FIELDS = "phone name role accountType createdAt";

export function listAdminCustomers(
  pagination: PaginationQuery,
  filters: { phone?: string; accountType?: string },
): Promise<PaginatedResult<HydratedDocument<User>>> {
  return paginate(
    UserModel,
    buildListFilter(filters),
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
    { select: CUSTOMER_LIST_FIELDS },
  );
}

export async function getAdminCustomerById(id: string): Promise<HydratedDocument<User>> {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  return user;
}

// P8.S7 -- the detail view. --------------------------------------------

const RECENT_ORDER_LIMIT = 10;

/**
 * One query per referenced collection rather than `.populate()` per
 * address: a customer with eight addresses in the same province would
 * otherwise fetch that province eight times.
 */
async function nameMap(
  model: { find: (filter: object) => { select: (fields: string) => Promise<NamedDoc[]> } },
  ids: Types.ObjectId[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const docs = await model.find({ _id: { $in: ids } }).select("name");
  return new Map(docs.map((doc) => [String(doc._id), doc.name.fa]));
}

interface NamedDoc {
  _id: unknown;
  name: { fa: string };
}

async function orderStatsFor(userId: Types.ObjectId): Promise<{
  stats: AdminCustomerDetailDto["stats"];
  recentOrders: AdminCustomerDetailDto["recentOrders"];
}> {
  const [totals] = await OrderModel.aggregate<{
    orderCount: number;
    lifetimeValueRial: number;
    lastOrderAt: Date;
  }>([
    // Aggregation bypasses the soft-delete middleware entirely
    // (models/plugins.ts), so `deletedAt` is matched explicitly here.
    {
      $match: { userId, deletedAt: null, status: { $in: [...REVENUE_ORDER_STATUSES] } },
    },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        lifetimeValueRial: { $sum: "$totalRial" },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);

  const [openOrderCount, recent] = await Promise.all([
    OrderModel.countDocuments({ userId, status: { $in: ["pending", "processing"] } }),
    OrderModel.find({ userId })
      .select("code status totalRial createdAt")
      .sort({ createdAt: -1 })
      .limit(RECENT_ORDER_LIMIT),
  ]);

  const orderCount = totals?.orderCount ?? 0;
  const lifetimeValueRial = totals?.lifetimeValueRial ?? 0;
  return {
    stats: {
      orderCount,
      lifetimeValueRial,
      averageOrderRial: orderCount === 0 ? 0 : Math.round(lifetimeValueRial / orderCount),
      lastOrderAt: totals?.lastOrderAt ? totals.lastOrderAt.toISOString() : null,
      openOrderCount,
    },
    recentOrders: recent.map((doc) => ({
      id: String(doc._id),
      code: doc.code,
      status: doc.status,
      totalRial: doc.totalRial,
      createdAt: doc.createdAt.toISOString(),
    })),
  };
}

export async function getAdminCustomerDetail(id: string): Promise<AdminCustomerDetailDto> {
  const user = await getAdminCustomerById(id);

  const [provinces, cities, makes, models, generations, orderData] = await Promise.all([
    nameMap(
      ProvinceModel,
      user.addresses.map((address) => address.provinceId),
    ),
    nameMap(
      CityModel,
      user.addresses.map((address) => address.cityId),
    ),
    nameMap(
      VehicleMakeModel,
      user.garage.map((entry) => entry.makeId),
    ),
    nameMap(
      VehicleModelModel,
      user.garage.map((entry) => entry.modelId),
    ),
    nameMap(
      VehicleGenModel,
      user.garage.map((entry) => entry.genId),
    ),
    orderStatsFor(user._id),
  ]);

  // A referenced province/vehicle that no longer resolves must not blank
  // out the whole row -- staff still need the rest of the address.
  const UNKNOWN = "—";

  return {
    id: String(user._id),
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
      id: String(address._id),
      province: provinces.get(String(address.provinceId)) ?? UNKNOWN,
      city: cities.get(String(address.cityId)) ?? UNKNOWN,
      line: address.line,
      postalCode: address.postalCode,
      ...(address.plate ? { plate: address.plate } : {}),
      ...(address.unit ? { unit: address.unit } : {}),
      receiverName: address.receiverName,
      receiverPhone: address.receiverPhone,
    })),
    garage: user.garage.map((entry, index) => ({
      // GarageEntry declares no `_id` in its interface even though the
      // sub-schema creates one, so the index is the stable key here.
      id: `${String(user._id)}-${index}`,
      make: makes.get(String(entry.makeId)) ?? UNKNOWN,
      model: models.get(String(entry.modelId)) ?? UNKNOWN,
      generation: generations.get(String(entry.genId)) ?? UNKNOWN,
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
): Promise<HydratedDocument<User>> {
  const user = await getAdminCustomerById(id);
  if (user.role !== "customer") {
    throw new ApiError(400, "نوع حساب فقط برای مشتریان قابل تغییر است");
  }
  user.accountType = input.accountType;
  await user.save();
  return user;
}
