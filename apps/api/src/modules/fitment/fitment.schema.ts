import { z } from "zod";
import { vehicleKeySchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");
const slugField = z.string().regex(/^[a-z0-9-]+$/, "نامک نامعتبر است");

export const fitmentCheckQuerySchema = z.object({
  productId: objectId,
  vehicleKey: vehicleKeySchema,
});
export type FitmentCheckQuery = z.infer<typeof fitmentCheckQuerySchema>;

export const fitmentProductsQuerySchema = paginationQuerySchema.extend({
  vehicleKey: vehicleKeySchema,
  category: slugField.optional(),
});
export type FitmentProductsQuery = z.infer<typeof fitmentProductsQuerySchema>;
