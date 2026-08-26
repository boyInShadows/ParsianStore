import type { FilterQuery, HydratedDocument } from "mongoose";
import { resolveEffectivePriceRial, toPublicProductJson } from "../catalog/pricing.js";
import { CartModel, nextCartExpiry, type Cart, type CartItem } from "../../models/Cart.js";
import { ProductModel } from "../../models/Product.js";
import type { AccountType } from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  computeDiscountRial,
  findCouponByCode,
  normalizeCouponCode,
  validateCoupon,
} from "../coupons/coupon.service.js";

export type CartIdentity = { userId: string } | { anonId: string };

function identityFilter(identity: CartIdentity): FilterQuery<Cart> {
  return "userId" in identity ? { userId: identity.userId } : { anonId: identity.anonId };
}

/** Atomic upsert (matches wishlist.service.ts's addToWishlist shape) --
 * plain "find, then create if missing" would let two near-simultaneous
 * first requests from the same brand-new guest each mint a different
 * anonId and collide on the sparse-unique index. */
export async function findOrCreateCart(identity: CartIdentity): Promise<HydratedDocument<Cart>> {
  const filter = identityFilter(identity);
  const cart = await CartModel.findOneAndUpdate(
    filter,
    { $setOnInsert: { ...filter, items: [], expiresAt: nextCartExpiry() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return cart!;
}

/** Increment the matching line's qty, or push a new line if the product
 * isn't already in the cart -- one atomic update either way, never a
 * load-mutate-save round trip (a plan-review finding: the merge below can
 * race a just-logged-in client's own concurrent addItem call). Refreshes
 * priceRialSnapshot to the current price on every touch. */
async function incrementOrPushItem(
  filter: FilterQuery<Cart>,
  item: Pick<CartItem, "productId" | "variantId" | "qty" | "priceRialSnapshot">,
): Promise<HydratedDocument<Cart> | null> {
  const lineMatch = item.variantId
    ? { productId: item.productId, variantId: item.variantId }
    : { productId: item.productId, variantId: { $exists: false } };
  const incremented = await CartModel.findOneAndUpdate(
    { ...filter, items: { $elemMatch: lineMatch } },
    {
      $inc: { "items.$.qty": item.qty },
      $set: {
        expiresAt: nextCartExpiry(),
        "items.$.priceRialSnapshot": item.priceRialSnapshot,
      },
    },
    { new: true },
  );
  if (incremented) {
    return incremented;
  }
  return CartModel.findOneAndUpdate(
    filter,
    { $push: { items: item }, $set: { expiresAt: nextCartExpiry() } },
    { new: true },
  );
}

export async function addItem(
  identity: CartIdentity,
  productId: string,
  qty: number,
  accountType: AccountType | undefined,
  variantId?: string,
): Promise<void> {
  const product = await ProductModel.findById(productId).select("+wholesalePriceRial");
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  const variant = variantId
    ? product.variants.find((item) => item._id?.toString() === variantId)
    : undefined;
  if (variantId && !variant) throw new ApiError(404, "گونه محصول یافت نشد");
  if (product.variants.length > 0 && !variant)
    throw new ApiError(400, "انتخاب گونه محصول الزامی است");
  const priceRialSnapshot = variant
    ? accountType === "wholesale" && variant.wholesalePriceRial != null
      ? variant.wholesalePriceRial
      : variant.priceRial
    : resolveEffectivePriceRial(product, accountType);
  await findOrCreateCart(identity);
  await incrementOrPushItem(identityFilter(identity), {
    productId: product._id,
    variantId: variant?._id,
    qty,
    // Snapshots the EFFECTIVE (tier-resolved) price this identity saw at
    // add-time, not always retail -- priceRialSnapshot's only purpose is
    // the "price changed since you added it" UI hint, and it must compare
    // apples to apples against whichever price getCart resolves later for
    // the same accountType.
    priceRialSnapshot,
  });
}

export async function updateItemQty(
  identity: CartIdentity,
  itemId: string,
  qty: number,
): Promise<void> {
  const updated = await CartModel.findOneAndUpdate(
    { ...identityFilter(identity), "items._id": itemId },
    { $set: { "items.$.qty": qty, expiresAt: nextCartExpiry() } },
  );
  if (!updated) {
    throw new ApiError(404, "قلم سبد خرید یافت نشد");
  }
}

export async function removeItem(identity: CartIdentity, itemId: string): Promise<void> {
  const updated = await CartModel.findOneAndUpdate(identityFilter(identity), {
    $pull: { items: { _id: itemId } },
    $set: { expiresAt: nextCartExpiry() },
  });
  if (!updated) {
    throw new ApiError(404, "سبد خرید یافت نشد");
  }
}

/** Called from cart.controller.ts's getCartHandler (never from
 * modules/auth -- a plan-review finding: routing this through
 * auth.controller.ts would be new, unprecedented cross-module coupling
 * with no failure isolation from login itself). findOneAndDelete makes
 * the fetch-and-remove atomic: two concurrent triggers of the same merge
 * (e.g. two tabs) can't both read the same not-yet-deleted anon cart and
 * double-count quantities -- only the first caller gets a non-null
 * result, the second gets null and no-ops. */
export async function mergeGuestCartIntoUser(anonId: string, userId: string): Promise<void> {
  const guestCart = await CartModel.findOneAndDelete({ anonId });
  if (!guestCart || guestCart.items.length === 0) {
    return;
  }
  await findOrCreateCart({ userId });
  const filter: FilterQuery<Cart> = { userId };
  for (const item of guestCart.items) {
    await incrementOrPushItem(filter, {
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      priceRialSnapshot: item.priceRialSnapshot,
    });
  }
}

/** Called by modules/payments once a checkout's payment actually
 * verifies -- the order now owns a snapshot of every line, so the cart
 * that produced it is emptied rather than left stale for the shopper to
 * clear by hand. */
export async function clearCart(identity: CartIdentity): Promise<void> {
  await CartModel.updateOne(identityFilter(identity), {
    $set: { items: [], expiresAt: nextCartExpiry() },
  });
}

export interface CartItemView {
  id: string;
  productId: string;
  variantId?: string;
  variant?: { name: { fa: string; en: string }; sku: string };
  qty: number;
  priceRialSnapshot: number;
  // Already shaped via toPublicProductJson -- never the raw Mongoose
  // document, so a wholesale-selected wholesalePriceRial can't leak into
  // the cart response either.
  product: Record<string, unknown>;
  availableQty: number;
  stockOk: boolean;
  priceChanged: boolean;
  lineTotalRial: number;
}

export interface CartView {
  id: string;
  items: CartItemView[];
  subtotalRial: number;
  discountRial: number;
  totalRial: number;
  couponCode?: string;
  // Set when Cart.couponCode is attached but no longer actually applies
  // (expired, exhausted, subtotal dropped below the minimum, ...) --
  // never auto-cleared from the stored cart (see applyCoupon/removeCoupon
  // below), so a shopper who adds more items and crosses a minSubtotal
  // threshold again sees the same code silently reactivate.
  couponIssue?: string;
}

/** Separate-query hydration, not `.populate()` (same convention as
 * wishlist.service.ts/products.service.ts). Money rule discipline: every
 * total is computed from LIVE Product.priceRial, never the stored
 * snapshot -- §3.6 "cart totals recomputed server-side at every step."
 * Live stock re-validation surfaces mismatches in the read-time view
 * only; the stored qty is never silently clamped -- the UI shows the
 * problem, the shopper decides. Shipping/tax are still not part of this
 * total (§13 P6.S4/checkout resolve those separately); the coupon
 * discount (P6.S7) is, since it's a property of the cart itself. */
export async function getCart(
  identity: CartIdentity,
  accountType: AccountType | undefined,
): Promise<CartView> {
  const cart = await findOrCreateCart(identity);
  if (cart.items.length === 0) {
    return { id: cart._id.toString(), items: [], subtotalRial: 0, discountRial: 0, totalRial: 0 };
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await ProductModel.find({ _id: { $in: productIds } }).select(
    "+wholesalePriceRial",
  );
  const productById = new Map(products.map((product) => [product._id.toString(), product]));

  const items: CartItemView[] = [];
  for (const item of cart.items) {
    const product = productById.get(item.productId.toString());
    // A product removed/soft-deleted since being added -- drop the line
    // from the view rather than crash, same orphan-drop convention
    // wishlist.service.ts's listWishlist already uses.
    if (!product) continue;

    const variant = item.variantId
      ? product.variants.find((entry) => entry._id?.toString() === item.variantId?.toString())
      : undefined;
    if (item.variantId && !variant) continue;
    const liveStock = variant?.stock ?? product.stock;
    const availableQty = product.backorderable ? item.qty : Math.min(item.qty, liveStock);
    const stockOk = product.backorderable || liveStock >= item.qty;
    const effectivePriceRial = variant
      ? accountType === "wholesale" && variant.wholesalePriceRial != null
        ? variant.wholesalePriceRial
        : variant.priceRial
      : resolveEffectivePriceRial(product, accountType);
    const lineTotalRial = effectivePriceRial * item.qty;

    items.push({
      id: item._id!.toString(),
      productId: item.productId.toString(),
      variantId: item.variantId?.toString(),
      variant: variant ? { name: variant.name, sku: variant.sku } : undefined,
      qty: item.qty,
      priceRialSnapshot: item.priceRialSnapshot,
      product: toPublicProductJson(product, accountType),
      availableQty,
      stockOk,
      priceChanged: effectivePriceRial !== item.priceRialSnapshot,
      lineTotalRial,
    });
  }

  const subtotalRial = items.reduce((sum, item) => sum + item.lineTotalRial, 0);

  let discountRial = 0;
  let couponCode: string | undefined;
  let couponIssue: string | undefined;
  if (cart.couponCode) {
    const coupon = await findCouponByCode(cart.couponCode);
    if (!coupon) {
      couponIssue = "این کد تخفیف دیگر معتبر نیست";
    } else {
      const userId = "userId" in identity ? identity.userId : undefined;
      const issue = await validateCoupon(coupon, subtotalRial, userId);
      if (issue) {
        couponIssue = issue;
      } else {
        discountRial = computeDiscountRial(coupon, subtotalRial);
        couponCode = coupon.code;
      }
    }
  }

  return {
    id: cart._id.toString(),
    items,
    subtotalRial,
    discountRial,
    totalRial: subtotalRial - discountRial,
    couponCode,
    couponIssue,
  };
}

/** Looks the code up, validates it against the cart's own live subtotal,
 * and only then writes it onto Cart.couponCode -- a shopper never sees
 * "applied" for a code that wouldn't actually discount anything.
 * Re-validated again on every subsequent getCart() read (and once more,
 * authoritatively, at checkout initiation) rather than trusted from this
 * one-time check. */
export async function applyCoupon(
  identity: CartIdentity,
  rawCode: string,
  accountType: AccountType | undefined,
): Promise<CartView> {
  const coupon = await findCouponByCode(rawCode);
  if (!coupon) {
    throw new ApiError(404, "کد تخفیف یافت نشد");
  }

  const current = await getCart(identity, accountType);
  const userId = "userId" in identity ? identity.userId : undefined;
  const issue = await validateCoupon(coupon, current.subtotalRial, userId);
  if (issue) {
    throw new ApiError(400, issue);
  }

  await CartModel.updateOne(identityFilter(identity), {
    $set: { couponCode: normalizeCouponCode(rawCode) },
  });
  return getCart(identity, accountType);
}

export async function removeCoupon(
  identity: CartIdentity,
  accountType: AccountType | undefined,
): Promise<CartView> {
  await CartModel.updateOne(identityFilter(identity), { $unset: { couponCode: "" } });
  return getCart(identity, accountType);
}
