import type { WishlistItemDto } from "schemas";
import { guardProductListItem } from "@/lib/fetchers/product-guard";
import { isNumber, isPlainObject, isString, toValidDate } from "@/lib/shape-guard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// P15.S8b: hand-written shape guards replacing zod's safeParse -- see
// lib/shape-guard.ts's own comment for why. `use-auth-session.ts` imports
// `useWishlistStore` (which imports this module) at the top level so
// every WishlistButton shares one request, which pulled this module's
// zod cost into every shop route even before a visitor ever opens the
// wishlist.
//
// A "parse" style function (not a `value is T` predicate) on purpose --
// `createdAt` mirrors zod's `z.coerce.date()`, which returns a *coerced*
// `Date` instance, not the raw wire string. A predicate can only narrow
// the existing value's type, it can't hand back a transformed one, so
// callers would end up with a value typed `Date` that is a `string` at
// runtime. Returning the built object avoids that mismatch.
function parseWishlistItem(value: unknown): WishlistItemDto | undefined {
  if (!isPlainObject(value)) return undefined;
  const createdAt = toValidDate(value.createdAt);
  if (createdAt === undefined) return undefined;
  if (!isString(value.id) || !isString(value.productId)) return undefined;
  if (!guardProductListItem(value.product)) return undefined;
  return { id: value.id, productId: value.productId, createdAt, product: value.product };
}

// Mirrors packages/schemas/src/wishlist.ts's wishlistResponseSchema.
function guardWishlistResponse(
  json: unknown,
):
  | { success: true; data: WishlistItemDto[]; meta: { total: number; page: number; limit: number } }
  | { success: false } {
  if (
    !isPlainObject(json) ||
    json.ok !== true ||
    !Array.isArray(json.data) ||
    !isPlainObject(json.meta) ||
    !isNumber(json.meta.total) ||
    !isNumber(json.meta.page) ||
    !isNumber(json.meta.limit)
  ) {
    return { success: false };
  }
  const data: WishlistItemDto[] = [];
  for (const item of json.data) {
    const parsed = parseWishlistItem(item);
    if (parsed === undefined) return { success: false };
    data.push(parsed);
  }
  return {
    success: true,
    data,
    meta: { total: json.meta.total, page: json.meta.page, limit: json.meta.limit },
  };
}

// Mirrors packages/schemas/src/wishlist.ts's wishlistMutationResponseSchema
// -- callers only ever check whether the response matched the shape, never
// read the parsed value (see addToWishlist/removeFromWishlist below).
function isWishlistMutationResponse(json: unknown): boolean {
  return (
    isPlainObject(json) &&
    json.ok === true &&
    isPlainObject(json.data) &&
    isString(json.data.productId) &&
    typeof json.data.isSaved === "boolean"
  );
}

// Server-side only (called from the /wishlist Server Component with the
// incoming request's own cookies forwarded explicitly) -- same
// cookie-forwarding + result-type pattern fetchOrders (lib/fetchers/orders.ts)
// already established, unlike fetchWishlistIds below which is a
// credentials:"include" client-context fetch.
export type WishlistFetchResult<T> =
  { ok: true; data: T } | { ok: false; reason: "unauthorized" | "down" };

export interface WishlistPage {
  data: WishlistItemDto[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchWishlist(
  page: number,
  limit: number,
  cookieHeader: string,
): Promise<WishlistFetchResult<WishlistPage>> {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await fetch(`${API_URL}/api/v1/me/wishlist?${params.toString()}`, {
      headers: { cookie: cookieHeader },
    });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (!res.ok) return { ok: false, reason: "down" };
    const json = await res.json();
    const parsed = guardWishlistResponse(json);
    if (!parsed.success) return { ok: false, reason: "down" };
    return {
      ok: true,
      data: {
        data: parsed.data,
        total: parsed.meta.total,
        page: parsed.meta.page,
        limit: parsed.meta.limit,
      },
    };
  } catch {
    return { ok: false, reason: "down" };
  }
}

/** All saved product ids for the current user, one page's worth (capped at
 * utils/pagination.ts's own 100-item ceiling) -- enough to seed every
 * WishlistButton's initial state from a single request instead of one
 * fetch per card. A user with more than 100 saved products would see the
 * button start unchecked for anything past the first page -- an accepted
 * v1 tradeoff until the Phase 7 dashboard needs true pagination through
 * this same endpoint. */
export async function fetchWishlistIds(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/wishlist?limit=100`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = guardWishlistResponse(json);
    return parsed.success ? parsed.data.map((item) => item.productId) : [];
  } catch {
    return [];
  }
}

export async function addToWishlist(productId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/wishlist/${productId}`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = await res.json();
    return isWishlistMutationResponse(json);
  } catch {
    return false;
  }
}

export async function removeFromWishlist(productId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/wishlist/${productId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = await res.json();
    return isWishlistMutationResponse(json);
  } catch {
    return false;
  }
}
