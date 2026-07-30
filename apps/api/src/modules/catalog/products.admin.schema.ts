import { z } from "zod";
import {
  adminCreateProductInputSchema,
  adminUpdateProductInputSchema,
  productStatusSchema,
} from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const adminProductIdParamSchema = z.object({ id: objectId });
export type AdminProductIdParam = z.infer<typeof adminProductIdParamSchema>;

export const adminProductListQuerySchema = paginationQuerySchema.extend({
  status: productStatusSchema.optional(),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

export const createProductSchema = adminCreateProductInputSchema;
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = adminUpdateProductInputSchema;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
