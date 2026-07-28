import { z } from "zod";
import { vehicleKeySchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { attributesField, booleanQueryParam, slugField } from "./products.schema.js";

export const searchProductsQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional().default(""),
  vehicle: vehicleKeySchema.optional(),
});
export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;

// Same filter shape as listProductsQuerySchema (products.schema.ts), minus
// sort/cursor/limit -- /catalog/facets reports counts "if you also applied
// this filter" against the PLP's own current filter set (P5.S1), so it
// must accept every filter the product grid itself does.
export const facetsQuerySchema = z
  .object({
    category: slugField.optional(),
    brand: slugField.optional(),
    vehicle: vehicleKeySchema.optional(),
    minPriceRial: z.coerce.number().int().min(0).optional(),
    maxPriceRial: z.coerce.number().int().min(0).optional(),
    attributes: attributesField,
    inStock: booleanQueryParam,
  })
  .refine(
    (value) =>
      value.minPriceRial === undefined ||
      value.maxPriceRial === undefined ||
      value.minPriceRial <= value.maxPriceRial,
    { message: "حداقل قیمت نمی‌تواند از حداکثر قیمت بیشتر باشد", path: ["minPriceRial"] },
  );
export type FacetsQuery = z.infer<typeof facetsQuerySchema>;
