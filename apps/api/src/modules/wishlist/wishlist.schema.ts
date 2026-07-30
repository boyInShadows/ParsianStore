import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const wishlistProductParamSchema = z.object({
  productId: objectId,
});
export type WishlistProductParam = z.infer<typeof wishlistProductParamSchema>;

export const wishlistListQuerySchema = paginationQuerySchema;
export type WishlistListQuery = z.infer<typeof wishlistListQuerySchema>;
