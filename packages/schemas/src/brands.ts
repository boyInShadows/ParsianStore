import { z } from "zod";

const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

export const brandSchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
});
export type BrandDto = z.infer<typeof brandSchema>;

export const brandsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(brandSchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});
