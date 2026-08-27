import { z } from "zod";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const initiateCheckoutSchema = z.object({
  addressId: objectId,
  shippingMethodCode: z.string().min(1, "روش ارسال را انتخاب کنید"),
  notes: z.string().max(500).optional(),
});
export type InitiateCheckoutInput = z.infer<typeof initiateCheckoutSchema>;
