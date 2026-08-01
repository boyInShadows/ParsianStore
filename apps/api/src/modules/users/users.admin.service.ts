import type { FilterQuery, HydratedDocument } from "mongoose";
import { toEnglishDigits } from "schemas";
import { UserModel, type User } from "../../models/User.js";
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
