import { z } from "zod";

// Mirrors the subset of apps/api/src/models/Product.ts that apps/web
// actually renders (landing's featured grid + authenticity story,
// P4.S4) -- same reasoning as facets.ts/vehicles.ts: apps/api has no
// Zod schema for its own list responses, but the web client needs to
// validate an external fetch at runtime.
const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

export const SUPPLY_ROUTES = ["oem", "genuine-imported", "domestic", "grade1-aftermarket"] as const;

const authenticitySchema = z.object({
  supplyRoute: z.enum(SUPPLY_ROUTES),
  sourceBrand: z.string(),
  countryOfManufacture: z.string(),
  hologramCode: z.string().optional(),
  guideUrl: z.string().optional(),
  verificationCode: z.string(),
});

export const productListItemSchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
  priceRial: z.number(),
  compareAtRial: z.number().optional(),
  stock: z.number(),
  media: z.array(z.string()),
  authenticity: authenticitySchema,
});
export type ProductListItemDto = z.infer<typeof productListItemSchema>;

export const productsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(productListItemSchema),
  meta: z.object({ nextCursor: z.string().nullable(), limit: z.number() }),
});
