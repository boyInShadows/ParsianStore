import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const initiateCheckoutSchema = z.object({
  addressId: objectId,
  shippingMethodCode: z.string().min(1, "روش ارسال را انتخاب کنید"),
  notes: z.string().max(500).optional(),
});
export type InitiateCheckoutInput = z.infer<typeof initiateCheckoutSchema>;
