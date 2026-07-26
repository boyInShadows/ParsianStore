import { z } from "zod";
import { vehicleKeySchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

export const searchProductsQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional().default(""),
  vehicle: vehicleKeySchema.optional(),
});
export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;

export const facetsQuerySchema = z.object({
  vehicle: vehicleKeySchema.optional(),
});
export type FacetsQuery = z.infer<typeof facetsQuerySchema>;
