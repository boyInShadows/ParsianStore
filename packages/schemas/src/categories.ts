import { z } from "zod";

// Mirrors the subset of apps/api/src/models/Category.ts the PLP route
// needs (P5.S1) -- same reasoning as facets.ts/products.ts: apps/api has
// no Zod schema for its own list/detail responses, but the web client
// needs to validate an external fetch at runtime.
const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

export const categorySchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
  parentId: z.string().nullable(),
  // Root-first ancestor slugs, self excluded -- see Category.path's own
  // doc comment. Empty for every category today (P3.S7 seeded 10 flat
  // root categories, one per CATALOG_SYSTEMS entry), but the PLP resolves
  // it generically since the Category model and its admin CRUD already
  // support real subcategories.
  path: z.array(z.string()),
});
export type CategoryDto = z.infer<typeof categorySchema>;

export const categoryResponseSchema = z.object({
  ok: z.literal(true),
  data: categorySchema,
});

export const categoriesResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(categorySchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});
