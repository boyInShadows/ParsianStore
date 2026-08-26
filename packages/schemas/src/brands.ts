import { z } from "zod";

const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

export const brandSchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
  logo: z.string().optional(),
  country: z.string(),
  isOEM: z.boolean(),
  description: z.string().optional(),
  // Mongoose omits the empty nested object on seeded brands. Normalize it
  // here so consumers always get one stable shape without making the API
  // fabricate empty strings.
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).default({}),
});
export type BrandDto = z.infer<typeof brandSchema>;

export const brandsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(brandSchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});

export const brandResponseSchema = z.object({
  ok: z.literal(true),
  data: brandSchema,
});
