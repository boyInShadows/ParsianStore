import type { Request, Response } from "express";
import * as wishlistService from "./wishlist.service.js";
import type { WishlistListQuery, WishlistProductParam } from "./wishlist.schema.js";

export async function listWishlistHandler(req: Request, res: Response): Promise<void> {
  const pagination = req.validatedQuery as WishlistListQuery;
  // The service returns finished DTOs now, shaped for this viewer. Doing it
  // there rather than here is what keeps the raw wholesale price from ever
  // leaving the module: a Prisma row carries every column, so a service that
  // returned rows would be handing the leak to the layer above.
  const { data, meta } = await wishlistService.listWishlist(
    req.user!.sub,
    pagination,
    req.user!.accountType,
  );
  res.json({ ok: true, data, meta });
}

export async function addToWishlistHandler(req: Request, res: Response): Promise<void> {
  const { productId } = req.params as unknown as WishlistProductParam;
  await wishlistService.addToWishlist(req.user!.sub, productId);
  res.json({ ok: true, data: { productId, isSaved: true } });
}

export async function removeFromWishlistHandler(req: Request, res: Response): Promise<void> {
  const { productId } = req.params as unknown as WishlistProductParam;
  await wishlistService.removeFromWishlist(req.user!.sub, productId);
  res.json({ ok: true, data: { productId, isSaved: false } });
}
