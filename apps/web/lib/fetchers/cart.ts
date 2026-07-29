import { cartResponseSchema, type CartDto } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Client-side only, all credentials:"include" -- the server-set anonId
// cookie (guest identity) and accessToken cookie (when signed in) both
// ride along automatically, same mechanism P5.S7's auth/wishlist
// fetchers already proved works cross-port.
async function parseCart(res: Response): Promise<CartDto | null> {
  if (!res.ok) return null;
  const json = await res.json();
  const parsed = cartResponseSchema.safeParse(json);
  return parsed.success ? parsed.data.data : null;
}

export async function fetchCart(): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart`, { credentials: "include" });
    return await parseCart(res);
  } catch {
    return null;
  }
}

export async function addCartItem(productId: string, qty = 1): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, qty }),
    });
    return await parseCart(res);
  } catch {
    return null;
  }
}

export async function updateCartItem(itemId: string, qty: number): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart/items/${itemId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty }),
    });
    return await parseCart(res);
  } catch {
    return null;
  }
}

export async function removeCartItem(itemId: string): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart/items/${itemId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return await parseCart(res);
  } catch {
    return null;
  }
}
