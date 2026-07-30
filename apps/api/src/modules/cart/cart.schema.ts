import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const addItemSchema = z.object({
  productId: objectId,
  qty: z.coerce.number().int().positive().default(1),
});
export type AddItemInput = z.infer<typeof addItemSchema>;

export const updateItemSchema = z.object({
  qty: z.coerce.number().int().positive(),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const cartItemIdParamSchema = z.object({
  id: objectId,
});
export type CartItemIdParam = z.infer<typeof cartItemIdParamSchema>;

// P6.S4
export const estimateShippingSchema = z.object({
  addressId: objectId,
});
export type EstimateShippingInput = z.infer<typeof estimateShippingSchema>;

// P6.S7
export const applyCouponSchema = z.object({
  code: z.string().min(1, "کد تخفیف را وارد کنید"),
});
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
