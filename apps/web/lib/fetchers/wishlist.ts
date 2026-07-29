import { wishlistMutationResponseSchema, wishlistResponseSchema } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
