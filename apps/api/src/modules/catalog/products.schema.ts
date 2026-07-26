import { z } from "zod";
import { vehicleKeySchema } from "schemas";

const slugField = z.string().regex(/^[a-z0-9-]+$/, "نامک نامعتبر است");
const booleanQueryParam = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const PRODUCT_SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;
export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number];

// "key:value,key2:value2" — validated as a shape here; parsed into actual
// pairs in products.service.ts, since turning it into a Mongo filter is
// domain logic, not a validation concern.
const attributesField = z
  .string()
  .regex(/^[a-z][a-z0-9_]*:[^,:]+(,[a-z][a-z0-9_]*:[^,:]+)*$/, "قالب فیلتر ویژگی‌ها نامعتبر است")
  .optional();

export const listProductsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(20),
    cursor: z.string().optional(),
    sort: z.enum(PRODUCT_SORT_OPTIONS).default("newest"),
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
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const productSlugParamSchema = z.object({ slug: slugField });

export const relatedProductsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(8),
});
export type RelatedProductsQuery = z.infer<typeof relatedProductsQuerySchema>;
