import type { NextFunction, Request, Response } from "express";
import * as wishlistService from "./wishlist.service.js";
import type { WishlistListQuery, WishlistProductParam } from "./wishlist.schema.js";

export async function listWishlistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = req.validatedQuery as WishlistListQuery;
    const { data, meta } = await wishlistService.listWishlist(req.user!.sub, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function addToWishlistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId } = req.params as unknown as WishlistProductParam;
    await wishlistService.addToWishlist(req.user!.sub, productId);
    res.json({ ok: true, data: { productId, isSaved: true } });
  } catch (err) {
    next(err);
  }
}

export async function removeFromWishlistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId } = req.params as unknown as WishlistProductParam;
    await wishlistService.removeFromWishlist(req.user!.sub, productId);
    res.json({ ok: true, data: { productId, isSaved: false } });
  } catch (err) {
    next(err);
  }
}
