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

// GET /catalog/products/:slug/related (P5.S2) uses plain page/limit
// pagination (utils/pagination.ts), not the cursor shape above -- a small
// bounded widget, not the scrollable listing cursorPaginate exists for
// (see products.service.ts's getRelatedProducts doc comment). Different
// meta shape, so it needs its own response schema, not productsResponseSchema.
export const relatedProductsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(productListItemSchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});

// The PDP (P5.S2) needs the full product record, not the list item's
// trimmed subset -- mirrors apps/api's enriched GET /catalog/products/:slug
// (products.service.ts's getProductDetailBySlug), which also resolves
// brand/category since Product only stores their raw ids.
const brandRefSchema = z.object({ id: z.string(), name: localizedNameSchema, slug: z.string() });
const categoryRefSchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
  path: z.array(z.string()),
});

export const productDetailSchema = productListItemSchema.extend({
  sku: z.string(),
  oemNumbers: z.array(z.string()),
  crossRefNumbers: z.array(z.string()),
  attributes: z.array(
    z.object({
      key: z.string(),
      keyLabel: z.string(),
      unit: z.string().optional(),
      value: z.string(),
    }),
  ),
  warranty: z.object({ months: z.number(), text: z.string() }),
  dimensions: z.object({ lengthMm: z.number(), widthMm: z.number(), heightMm: z.number() }),
  weightGram: z.number(),
  rating: z.object({ avg: z.number(), count: z.number() }),
  brand: brandRefSchema.nullable(),
  category: categoryRefSchema.nullable(),
});
export type ProductDetailDto = z.infer<typeof productDetailSchema>;

export const productDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: productDetailSchema,
});
