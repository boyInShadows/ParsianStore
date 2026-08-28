import type { AccountType } from "@prisma/client";
import type { ProductListItemDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { localized } from "../../utils/serialize.js";
import {
  resolveEffectivePriceRial,
  toProductListItem,
  type ProductRow,
} from "../catalog/pricing.js";
import {
  computeDiscountRial,
  findCouponByCode,
  normalizeCouponCode,
  validateCoupon,
} from "../coupons/coupon.service.js";

const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function nextCartExpiry(): Date {
  return new Date(Date.now() + CART_TTL_MS);
}

export type CartIdentity = { userId: string } | { anonId: string };

/** Both columns are unique, so this doubles as a `findUnique`/`upsert` key. */
function identityWhere(identity: CartIdentity): { userId: string } | { anonId: string } {
  return "userId" in identity ? { userId: identity.userId } : { anonId: identity.anonId };
}

interface CartRow {
  id: string;
  couponCode: string | null;
}

/**
 * Upsert rather than "find, then create if missing": two near-simultaneous
 * first requests from the same brand-new guest would otherwise both find
 * nothing and both insert.
 *
 * This is also why P10.S13's migration put a unique constraint back on
 * `userId` and `anonId`. Mongo had a sparse unique index there and the
 * schema translation had dropped it to a plain index, which quietly turned
 * "one cart per identity" from something the database enforced into
 * something this function merely hoped for.
 *
 * A cart is never soft-deleted anywhere in the app, which matters because
 * `upsert` is the one operation the soft-delete extension deliberately
 * leaves alone (see config/prisma.ts).
 */
export async function findOrCreateCart(identity: CartIdentity): Promise<CartRow> {
  const where = identityWhere(identity);
  return prisma.cart.upsert({
    where,
    create: { ...where, expiresAt: nextCartExpiry() },
    update: {},
    select: { id: true, couponCode: true },
  });
}

/**
 * Add to the matching line's qty, or write a new line -- and refresh
 * `priceRialSnapshot` on every touch either way.
 *
 * Read-then-write, where Mongo did it in one atomic `$inc`/`$push`. The
 * compound unique on (cartId, productId, variantId) cannot close that gap by
 * itself: PostgreSQL does not consider two nulls equal, so it constrains
 * variant lines but not the plain product lines that carry a null variantId.
 * Both statements run inside one transaction, which is what actually keeps a
 * concurrent add from interleaving between the read and the write.
 */
async function incrementOrAddItem(
  cartId: string,
  item: { productId: string; variantId: string | null; qty: number; priceRialSnapshot: number },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findFirst({
      where: { cartId, productId: item.productId, variantId: item.variantId },
      select: { id: true },
    });
    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { qty: { increment: item.qty }, priceRialSnapshot: item.priceRialSnapshot },
      });
    } else {
      await tx.cartItem.create({ data: { cartId, ...item } });
    }
    await tx.cart.update({ where: { id: cartId }, data: { expiresAt: nextCartExpiry() } });
  });
}

export async function addItem(
  identity: CartIdentity,
  productId: string,
  qty: number,
  accountType: AccountType | undefined,
  variantId?: string,
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { where: { deletedAt: null } } },
  });
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  const variant = variantId ? product.variants.find((entry) => entry.id === variantId) : undefined;
  if (variantId && !variant) throw new ApiError(404, "گونه محصول یافت نشد");
  if (product.variants.length > 0 && !variant)
    throw new ApiError(400, "انتخاب گونه محصول الزامی است");

  const priceRialSnapshot = variant
    ? accountType === "wholesale" && variant.wholesalePriceRial != null
      ? variant.wholesalePriceRial
      : variant.priceRial
    : resolveEffectivePriceRial(product, accountType);

  const cart = await findOrCreateCart(identity);
  await incrementOrAddItem(cart.id, {
    productId: product.id,
    variantId: variant?.id ?? null,
    qty,
    // Snapshots the EFFECTIVE (tier-resolved) price this identity saw at
    // add-time, not always retail -- priceRialSnapshot's only purpose is
    // the "price changed since you added it" UI hint, and it must compare
    // apples to apples against whichever price getCart resolves later for
    // the same accountType.
    priceRialSnapshot,
  });
}

/**
 * The line is addressed by its own id *and* the caller's cart, so one
 * shopper cannot edit another's line by guessing an id. `updateMany` rather
 * than `update` for exactly that reason: `update` takes a unique where, and
 * the id alone is the only unique thing here.
 */
export async function updateItemQty(
  identity: CartIdentity,
  itemId: string,
  qty: number,
): Promise<void> {
  const cart = await findOrCreateCart(identity);
  const { count } = await prisma.cartItem.updateMany({
    where: { id: itemId, cartId: cart.id },
    data: { qty },
  });
  if (count === 0) {
    throw new ApiError(404, "قلم سبد خرید یافت نشد");
  }
  await prisma.cart.update({ where: { id: cart.id }, data: { expiresAt: nextCartExpiry() } });
}

export async function removeItem(identity: CartIdentity, itemId: string): Promise<void> {
  const cart = await findOrCreateCart(identity);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { expiresAt: nextCartExpiry() } });
}

/**
 * Called from cart.controller.ts's getCartHandler (never from modules/auth --
 * a plan-review finding: routing this through auth.controller.ts would be
 * new, unprecedented cross-module coupling with no failure isolation from
 * login itself).
 *
 * The guest cart is deleted *before* its lines are merged, and the merge only
 * proceeds if this call is the one that deleted it. That reproduces what
 * `findOneAndDelete` gave us: two concurrent triggers of the same merge (two
 * tabs, say) cannot both read the same not-yet-deleted anon cart and
 * double-count its quantities.
 */
export async function mergeGuestCartIntoUser(anonId: string, userId: string): Promise<void> {
  const guestCart = await prisma.cart.findUnique({
    where: { anonId },
    select: { id: true, items: true },
  });
  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await prisma.cart.deleteMany({ where: { id: guestCart.id } });
    return;
  }

  const { count } = await prisma.cart.deleteMany({ where: { id: guestCart.id } });
  if (count === 0) return;

  const userCart = await findOrCreateCart({ userId });
  for (const item of guestCart.items) {
    await incrementOrAddItem(userCart.id, {
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
  const cart = await prisma.cart.findUnique({
    where: identityWhere(identity),
    select: { id: true },
  });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { expiresAt: nextCartExpiry() } });
}

export interface CartItemView {
  id: string;
  productId: string;
  variantId?: string;
  variant?: { name: { fa: string; en: string }; sku: string };
  qty: number;
  priceRialSnapshot: number;
  // Shaped through pricing.ts, never the raw row -- a wholesale-only
  // wholesalePriceRial must not reach the cart response either.
  product: ProductListItemDto;
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

/**
 * Money rule discipline: every total is computed from LIVE Product.priceRial,
 * never the stored snapshot -- §3.6 "cart totals recomputed server-side at
 * every step." Live stock re-validation surfaces mismatches in the read-time
 * view only; the stored qty is never silently clamped -- the UI shows the
 * problem, the shopper decides. Shipping/tax are still not part of this total
 * (§13 P6.S4/checkout resolve those separately); the coupon discount (P6.S7)
 * is, since it's a property of the cart itself.
 *
 * One query with joins, where Mongo needed the cart plus a second lookup of
 * every referenced product. The `deletedAt` checks below are explicit because
 * the soft-delete extension does not reach nested reads: a line whose product
 * or variant has since been deleted is dropped from the *view* rather than
 * crashing it, the same orphan-drop convention wishlist.service.ts uses.
 */
export async function getCart(
  identity: CartIdentity,
  accountType: AccountType | undefined,
): Promise<CartView> {
  const { id } = await findOrCreateCart(identity);
  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: { include: { variants: { where: { deletedAt: null } } } },
          variant: true,
        },
      },
    },
  });

  const items: CartItemView[] = [];
  for (const item of cart.items) {
    const product = item.product;
    if (product.deletedAt !== null) continue;
    if (item.variantId && (!item.variant || item.variant.deletedAt !== null)) continue;
    const variant = item.variant;

    const liveStock = variant?.stock ?? product.stock;
    const availableQty = product.backorderable ? item.qty : Math.min(item.qty, liveStock);
    const stockOk = product.backorderable || liveStock >= item.qty;
    const effectivePriceRial = variant
      ? accountType === "wholesale" && variant.wholesalePriceRial != null
        ? variant.wholesalePriceRial
        : variant.priceRial
      : resolveEffectivePriceRial(product, accountType);

    items.push({
      id: item.id,
      productId: item.productId,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(variant ? { variant: { name: localized(variant), sku: variant.sku } } : {}),
      qty: item.qty,
      priceRialSnapshot: item.priceRialSnapshot,
      product: toProductListItem(product as ProductRow, accountType),
      availableQty,
      stockOk,
      priceChanged: effectivePriceRial !== item.priceRialSnapshot,
      lineTotalRial: effectivePriceRial * item.qty,
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
    id: cart.id,
    items,
    subtotalRial,
    discountRial,
    totalRial: subtotalRial - discountRial,
    ...(couponCode ? { couponCode } : {}),
    ...(couponIssue ? { couponIssue } : {}),
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

  await prisma.cart.update({
    where: identityWhere(identity),
    data: { couponCode: normalizeCouponCode(rawCode) },
  });
  return getCart(identity, accountType);
}

export async function removeCoupon(
  identity: CartIdentity,
  accountType: AccountType | undefined,
): Promise<CartView> {
  await prisma.cart.updateMany({ where: identityWhere(identity), data: { couponCode: null } });
  return getCart(identity, accountType);
}
