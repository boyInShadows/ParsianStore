import { z } from "zod";

// Response shapes for GET /vehicles/{makes,models,generations} -- same
// reasoning as facets.ts: apps/api has no Zod schema for its own list
// responses (masterPlan.md rule 11 only mandates input validation), but
// apps/web's vehicle selector (P4.S3) needs to validate an external fetch
// at runtime.
const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const vehicleMakeSchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
});
export type VehicleMakeDto = z.infer<typeof vehicleMakeSchema>;

export const vehicleModelSchema = z.object({
  id: z.string(),
  makeId: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
});
export type VehicleModelDto = z.infer<typeof vehicleModelSchema>;

export const vehicleGenSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  name: localizedNameSchema,
  yearFrom: z.number(),
  yearTo: z.number().nullable(),
});
export type VehicleGenDto = z.infer<typeof vehicleGenSchema>;

export const vehicleMakesResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(vehicleMakeSchema),
  meta: paginationMetaSchema,
});

export const vehicleModelsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(vehicleModelSchema),
  meta: paginationMetaSchema,
});

export const vehicleGenerationsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(vehicleGenSchema),
  meta: paginationMetaSchema,
});
