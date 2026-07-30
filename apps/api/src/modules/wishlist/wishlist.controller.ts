import type { NextFunction, Request, Response } from "express";
import { toPublicProductJson } from "../catalog/pricing.js";
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
    res.json({
      ok: true,
      // Same account-aware shaping every other product-serving list uses
      // (products.controller.ts) -- listWishlist's own doc comment already
      // notes this is separate-query hydration, not the DTO shape itself;
      // a raw Product doc has no `isWholesalePrice` and would leak
      // `wholesalePriceRial` to a retail viewer.
      data: data.map((entry) => ({
        ...entry,
        product: toPublicProductJson(entry.product, req.user!.accountType),
      })),
      meta,
    });
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
