import { z } from "zod";

// Mirrors apps/api/src/providers/search/SearchProvider.ts's ProductFacets
// (FacetBucket/StockFacetBucket) -- the API itself has no Zod schema for
// this response (masterPlan.md rule 11 only mandates input validation),
// but apps/web needs to validate an external fetch at runtime, same as
// health.ts's healthResponseSchema.
const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

const facetBucketSchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
  count: z.number(),
});

const stockFacetBucketSchema = z.object({
  inStock: z.boolean(),
  count: z.number(),
});

// Attribute.name has no {fa,en} pair (internal admin/filter label) and
// `value` is already the exact Persian option string to display -- see
// apps/api's Attribute.ts and SearchProvider.ts for the full reasoning.
const attributeFacetBucketSchema = z.object({
  key: z.string(),
  keyLabel: z.string(),
  value: z.string(),
  count: z.number(),
});

export const facetsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    categories: z.array(facetBucketSchema),
    brands: z.array(facetBucketSchema),
    stock: z.array(stockFacetBucketSchema),
    attributes: z.array(attributeFacetBucketSchema),
  }),
});

export type FacetsResponse = z.infer<typeof facetsResponseSchema>;
export type FacetBucket = z.infer<typeof facetBucketSchema>;
export type AttributeFacetBucket = z.infer<typeof attributeFacetBucketSchema>;
