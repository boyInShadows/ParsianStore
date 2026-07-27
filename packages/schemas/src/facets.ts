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

export const facetsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    categories: z.array(facetBucketSchema),
    brands: z.array(facetBucketSchema),
    stock: z.array(stockFacetBucketSchema),
  }),
});

export type FacetsResponse = z.infer<typeof facetsResponseSchema>;
export type FacetBucket = z.infer<typeof facetBucketSchema>;
