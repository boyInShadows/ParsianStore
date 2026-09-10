import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const wishlistProductParamSchema = z.object({
  productId: objectId,
});
export type WishlistProductParam = z.infer<typeof wishlistProductParamSchema>;

export const wishlistListQuerySchema = paginationQuerySchema;
export type WishlistListQuery = z.infer<typeof wishlistListQuerySchema>;
