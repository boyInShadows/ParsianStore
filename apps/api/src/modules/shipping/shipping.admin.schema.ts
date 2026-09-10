import { z } from "zod";
import {
  SHIPPING_METHOD_CODES,
  SHIPPING_ZONES,
  adminCreateShippingRateInputSchema,
  adminUpdateShippingRateInputSchema,
} from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const adminShippingRateIdParamSchema = z.object({ id: objectId });

export const adminShippingRateListQuerySchema = paginationQuerySchema.extend({
  methodCode: z.enum(SHIPPING_METHOD_CODES).optional(),
  zone: z.enum(SHIPPING_ZONES).optional(),
  state: z.enum(["active", "deleted"]).optional().default("active"),
});
export type AdminShippingRateListQuery = z.infer<typeof adminShippingRateListQuerySchema>;

export const createShippingRateSchema = adminCreateShippingRateInputSchema;
export type CreateShippingRateInput = z.infer<typeof createShippingRateSchema>;

export const updateShippingRateSchema = adminUpdateShippingRateInputSchema;
export type UpdateShippingRateInput = z.infer<typeof updateShippingRateSchema>;
