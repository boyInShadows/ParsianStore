import {
  wishlistMutationResponseSchema,
  wishlistResponseSchema,
  type WishlistItemDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
    const parsed = wishlistResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: "down" };
    return {
      ok: true,
      data: {
        data: parsed.data.data,
        total: parsed.data.meta.total,
        page: parsed.data.meta.page,
        limit: parsed.data.meta.limit,
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
    const parsed = wishlistResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data.map((item) => item.productId) : [];
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
    return wishlistMutationResponseSchema.safeParse(json).success;
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
    return wishlistMutationResponseSchema.safeParse(json).success;
  } catch {
    return false;
  }
}
