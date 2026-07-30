import { z } from "zod";
import { orderStatusSchema, updateOrderStatusInputSchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const adminOrderIdParamSchema = z.object({ id: objectId });
export type AdminOrderIdParam = z.infer<typeof adminOrderIdParamSchema>;

export const adminOrderListQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.optional(),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const updateOrderStatusSchema = updateOrderStatusInputSchema;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
