import type { CartDto, CartItemDto } from "schemas";
import { API_URL, apiAction, apiFetch, jsonBody, type ActionResult } from "@/lib/api-fetch";
import { guardProductListItem } from "@/lib/fetchers/product-guard";
import {
  isArrayOf,
  isBoolean,
  isNumber,
  isOptionalString,
  isPlainObject,
  isString,
} from "@/lib/shape-guard";

// P15.S8b: hand-written shape guard replacing zod's safeParse -- see
// lib/shape-guard.ts's own comment for why. `CartSession` mounts on every
// shop route (as does the header's item-count badge), so this module's
// zod cost was paid on every route.
function guardCartItem(value: unknown): value is CartItemDto {
  if (!isPlainObject(value)) return false;
  const variant = value.variant;
  const variantOk =
    variant === undefined ||
    (isPlainObject(variant) &&
      isPlainObject(variant.name) &&
      isString(variant.name.fa) &&
      isString(variant.name.en) &&
      isString(variant.sku));
  return (
    isString(value.id) &&
    isString(value.productId) &&
    isOptionalString(value.variantId) &&
    variantOk &&
    isNumber(value.qty) &&
    isNumber(value.priceRialSnapshot) &&
    guardProductListItem(value.product) &&
    isNumber(value.availableQty) &&
    isBoolean(value.stockOk) &&
    isBoolean(value.priceChanged) &&
    isNumber(value.lineTotalRial)
  );
}

// Mirrors packages/schemas/src/cart.ts's cartResponseSchema.
function guardCartResponse(
  json: unknown,
): { success: true; data: { data: CartDto } } | { success: false } {
  if (!isPlainObject(json) || json.ok !== true || !isPlainObject(json.data)) {
    return { success: false };
  }
  const data = json.data;
  if (
    isString(data.id) &&
    isArrayOf(data.items, guardCartItem) &&
    isNumber(data.subtotalRial) &&
    isNumber(data.discountRial) &&
    isOptionalString(data.couponCode) &&
    isOptionalString(data.couponIssue) &&
    isNumber(data.totalRial)
  ) {
    return {
      success: true,
      data: {
        data: {
          id: data.id,
          items: data.items,
          subtotalRial: data.subtotalRial,
          discountRial: data.discountRial,
          couponCode: data.couponCode,
          couponIssue: data.couponIssue,
          totalRial: data.totalRial,
        },
      },
    };
  }
  return { success: false };
}

// Client-side only, all credentials:"include" -- the server-set anonId
// cookie (guest identity) and accessToken cookie (when signed in) both
// ride along automatically, same mechanism P5.S7's auth/wishlist
// fetchers already proved works cross-port.
const cartResponse = { safeParse: guardCartResponse };

async function cartRequest(path: string, init: RequestInit): Promise<CartDto | null> {
  const res = await apiFetch(`${API_URL}/api/v1/cart${path}`, cartResponse, {
    credentials: "include",
    ...init,
  });
  return res.ok ? res.data.data : null;
}

export type CouponActionResult = ActionResult<CartDto>;

export function fetchCart(): Promise<CartDto | null> {
  return cartRequest("", {});
}

export function addCartItem(
  productId: string,
  qty = 1,
  variantId?: string,
): Promise<CartDto | null> {
  return cartRequest("/items", { method: "POST", ...jsonBody({ productId, qty, variantId }) });
}

export function updateCartItem(itemId: string, qty: number): Promise<CartDto | null> {
  return cartRequest(`/items/${itemId}`, { method: "PATCH", ...jsonBody({ qty }) });
}

export function removeCartItem(itemId: string): Promise<CartDto | null> {
  return cartRequest(`/items/${itemId}`, { method: "DELETE" });
}

// P6.S7. Real error surfacing (unlike the plain-null pattern above) --
// a rejected coupon code needs to tell the shopper *why* ("this code has
// expired," "your cart doesn't meet the minimum") rather than a generic
// toast, same reasoning lib/fetchers/checkout.ts's own ActionResult
// pattern already established.
export function applyCartCoupon(code: string): Promise<CouponActionResult> {
  return apiAction(`${API_URL}/api/v1/cart/coupon`, cartResponse, {
    method: "POST",
    credentials: "include",
    ...jsonBody({ code }),
  });
}

export function removeCartCoupon(): Promise<CartDto | null> {
  return cartRequest("/coupon", { method: "DELETE" });
}
