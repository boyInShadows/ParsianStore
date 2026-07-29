import { z } from "zod";
import { productListItemSchema } from "./products.js";

// Mirrors apps/api's GET/POST/DELETE /me/wishlist (modules/wishlist) --
// same "apps/api has no Zod schema for its own responses" reasoning as
// products.ts. The list item reuses productListItemSchema wholesale --
// same card shape a saved-products view renders elsewhere.
export const wishlistItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  createdAt: z.coerce.date(),
  product: productListItemSchema,
});
export type WishlistItemDto = z.infer<typeof wishlistItemSchema>;

// GET /me/wishlist uses page/limit pagination (utils/pagination.ts) -- a
// per-user list, not the scrollable catalog cursorPaginate exists for.
export const wishlistResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(wishlistItemSchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});

// POST/DELETE /me/wishlist/:productId both return this same toggle-result
// shape (wishlist.controller.ts).
export const wishlistMutationSchema = z.object({
  productId: z.string(),
  isSaved: z.boolean(),
});
export type WishlistMutationDto = z.infer<typeof wishlistMutationSchema>;

export const wishlistMutationResponseSchema = z.object({
  ok: z.literal(true),
  data: wishlistMutationSchema,
});
