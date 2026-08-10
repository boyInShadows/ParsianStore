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
  // P8.S6: name/SKU search, added for the Fitment Manager's product
  // picker -- one product has to be findable out of the whole catalog.
  q: z.string().trim().min(1).optional(),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

export const createProductSchema = adminCreateProductInputSchema;
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = adminUpdateProductInputSchema;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export const removeProductMediaSchema = z.object({ url: z.string().url() });
export type RemoveProductMediaInput = z.infer<typeof removeProductMediaSchema>;
