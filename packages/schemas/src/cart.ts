import { z } from "zod";
import { productListItemSchema } from "./products.js";

// Mirrors apps/api's GET /cart, POST/PATCH/DELETE /cart/items (P5.S8) --
// same "apps/api has no Zod schema for its own responses" reasoning as
// products.ts/wishlist.ts. The hydrated product reuses
// productListItemSchema wholesale, same card shape as everywhere else.
export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qty: z.number(),
  priceRialSnapshot: z.number(),
  product: productListItemSchema,
  availableQty: z.number(),
  stockOk: z.boolean(),
  priceChanged: z.boolean(),
  lineTotalRial: z.number(),
});
export type CartItemDto = z.infer<typeof cartItemSchema>;

// A cart is one bounded owned resource, not a growable list -- single
// object, no `meta`, matching GET /auth/me's shape rather than the
// paginated wishlist shape.
export const cartResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    id: z.string(),
    items: z.array(cartItemSchema),
    subtotalRial: z.number(),
    totalRial: z.number(),
  }),
});
export type CartDto = z.infer<typeof cartResponseSchema>["data"];
