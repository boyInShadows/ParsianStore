import { z } from "zod";

// Mirrors apps/api's GET /geo/provinces and GET /geo/cities?provinceId
// (P2.S7) -- same "apps/api has no Zod schema for its own responses"
// reasoning as every other module in this package. This is the first
// real web consumer of either endpoint (P6.S6's address form province->
// city cascade) -- they've existed since P2.S7 with zero frontend
// callers until now.
const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

export const provinceSchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
});
export type ProvinceDto = z.infer<typeof provinceSchema>;

export const citySchema = z.object({
  id: z.string(),
  provinceId: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
});
export type CityDto = z.infer<typeof citySchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const provinceListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(provinceSchema),
  meta: paginationMetaSchema,
});

export const cityListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(citySchema),
  meta: paginationMetaSchema,
});
