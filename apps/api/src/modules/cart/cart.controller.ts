import type { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import { env } from "../../config/env.js";
import * as shippingService from "../shipping/shipping.service.js";
import * as cartService from "./cart.service.js";
import type {
  AddItemInput,
  ApplyCouponInput,
  CartItemIdParam,
  EstimateShippingInput,
  UpdateItemInput,
} from "./cart.schema.js";

const ANON_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Cookie read/write lives ONLY here, never in cart.service.ts (a
// plan-review finding: a service touching req/res would violate CLAUDE.md
// rule 12 -- "a service never touches req/res" -- every existing service
// in this codebase takes plain primitives). Mirrors
// auth.controller.ts's setSessionCookies pattern; anonId doesn't need to
// be secret, but httpOnly keeps it simple and consistent with the
// existing session cookies, and means no client-side cookie code is
// needed at all -- lib/fetchers/cart.ts just needs credentials:"include".
function resolveIdentity(req: Request, res: Response): cartService.CartIdentity {
  if (req.user) {
    return { userId: req.user.sub };
  }
  let anonId = req.cookies?.anonId as string | undefined;
  if (!anonId) {
    anonId = nanoid();
    res.cookie("anonId", anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: ANON_COOKIE_MAX_AGE_MS,
    });
  }
  return { anonId };
}

export async function getCartHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Guest -> auth merge happens here, lazily, on the first GET /cart
    // after login -- LoginForm.tsx force-reloads the cart right after
    // verifyOtp succeeds, so this is always reached promptly. Doing it
    // here (not in auth.controller.ts) keeps modules/auth entirely
    // ignorant that modules/cart exists.
    const anonId = req.cookies?.anonId as string | undefined;
    if (req.user && anonId) {
      await cartService.mergeGuestCartIntoUser(anonId, req.user.sub);
      res.clearCookie("anonId");
    }
    const identity = resolveIdentity(req, res);
    const cart = await cartService.getCart(identity, req.user?.accountType);
    res.json({ ok: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function addItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const identity = resolveIdentity(req, res);
    const { productId, qty } = req.body as AddItemInput;
    await cartService.addItem(identity, productId, qty, req.user?.accountType);
    const cart = await cartService.getCart(identity, req.user?.accountType);
    res.json({ ok: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function updateItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const identity = resolveIdentity(req, res);
    const { id } = req.params as unknown as CartItemIdParam;
    const { qty } = req.body as UpdateItemInput;
    await cartService.updateItemQty(identity, id, qty);
    const cart = await cartService.getCart(identity, req.user?.accountType);
    res.json({ ok: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function removeItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const identity = resolveIdentity(req, res);
    const { id } = req.params as unknown as CartItemIdParam;
    await cartService.removeItem(identity, id);
    const cart = await cartService.getCart(identity, req.user?.accountType);
    res.json({ ok: true, data: cart });
  } catch (err) {
    next(err);
  }
}

// P6.S7. optionalAuth is enough here (matches every other cart handler)
// -- perUserLimit simply doesn't apply to a guest's anonId identity
// (coupon.service.ts's validateCoupon only checks it when a userId is
// present), it's re-validated authoritatively at checkout initiation
// once the shopper is definitely signed in anyway.
export async function applyCouponHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const identity = resolveIdentity(req, res);
    const { code } = req.body as ApplyCouponInput;
    const cart = await cartService.applyCoupon(identity, code, req.user?.accountType);
    res.json({ ok: true, data: cart });
  } catch (err) {
    next(err);
  }
}

export async function removeCouponHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const identity = resolveIdentity(req, res);
    const cart = await cartService.removeCoupon(identity, req.user?.accountType);
    res.json({ ok: true, data: cart });
  } catch (err) {
    next(err);
  }
}

// P6.S4 -- requireAuth is applied on this one route specifically (see
// cart.routes.ts), so req.user is always populated here, unlike every
// other handler in this file.
export async function estimateShippingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { addressId } = req.body as EstimateShippingInput;
    const data = await shippingService.estimateShipping(
      req.user!.sub,
      addressId,
      req.user!.accountType,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
