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

export type CouponActionResult = { ok: true; data: CartDto } | { ok: false; message: string };

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

export async function fetchCart(): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart`, { credentials: "include" });
    return await parseCart(res);
  } catch {
    return null;
  }
}

export async function addCartItem(
  productId: string,
  qty = 1,
  variantId?: string,
): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, qty, variantId }),
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

// P6.S7. Real error surfacing (unlike the plain-null pattern above) --
// a rejected coupon code needs to tell the shopper *why* ("this code has
// expired," "your cart doesn't meet the minimum") rather than a generic
// toast, same reasoning lib/fetchers/checkout.ts's own ActionResult
// pattern already established.
export async function applyCartCoupon(code: string): Promise<CouponActionResult> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart/coupon`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = cartResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function removeCartCoupon(): Promise<CartDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart/coupon`, {
      method: "DELETE",
      credentials: "include",
    });
    return await parseCart(res);
  } catch {
    return null;
  }
}
