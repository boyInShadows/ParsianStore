import { z } from "zod";
import { productListItemSchema } from "./products.js";

// Mirrors apps/api's GET /cart, POST/PATCH/DELETE /cart/items (P5.S8) --
// same "apps/api has no Zod schema for its own responses" reasoning as
// products.ts/wishlist.ts. The hydrated product reuses
// productListItemSchema wholesale, same card shape as everywhere else.
export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  variant: z
    .object({ name: z.object({ fa: z.string(), en: z.string() }), sku: z.string() })
    .optional(),
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
    // P6.S7: discountRial/couponCode are already live-resolved server-side
    // (cart.service.ts's getCart()) -- totalRial already has the discount
    // subtracted, never re-derived on the client. couponIssue is a soft
    // hint (an attached code that's currently not applying, e.g. expired)
    // -- distinct from an apply-time hard error, which surfaces through
    // the POST /cart/coupon call's own error response instead.
    discountRial: z.number(),
    couponCode: z.string().optional(),
    couponIssue: z.string().optional(),
    totalRial: z.number(),
  }),
});
export type CartDto = z.infer<typeof cartResponseSchema>["data"];
