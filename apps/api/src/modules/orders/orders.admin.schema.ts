import { z } from "zod";
import { orderStatusSchema, updateOrderStatusInputSchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const adminOrderIdParamSchema = z.object({ id: objectId });
export type AdminOrderIdParam = z.infer<typeof adminOrderIdParamSchema>;

export const adminOrderListQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.optional(),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const updateOrderStatusSchema = updateOrderStatusInputSchema;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
