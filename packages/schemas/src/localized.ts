import { z } from "zod";

/**
 * The `{ fa, en }` pair that every named entity in the domain carries --
 * vehicle makes and models, provinces, cities, categories, brands.
 *
 * One definition rather than one per module: it was re-declared inline in
 * several schema files, and PostgreSQL stores it as two columns
 * (`nameFa`/`nameEn`), so the wire shape now has exactly one place to be
 * stated and one place to be changed.
 */
export const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

export type LocalizedName = z.infer<typeof localizedNameSchema>;

/** `seo{}` recurs across Category, Brand and Product with this same shape. */
export const seoMetaSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});

export type SeoMeta = z.infer<typeof seoMetaSchema>;
