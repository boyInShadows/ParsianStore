import { z } from "zod";
import {
  BODY_TYPES,
  FUEL_TYPES,
  adminCreateVehicleEngineInputSchema,
  adminCreateVehicleGenInputSchema,
  adminCreateVehicleMakeInputSchema,
  adminCreateVehicleModelInputSchema,
} from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const adminVehicleIdParamSchema = z.object({ id: objectId });

const stateFilter = z.enum(["active", "deleted"]).optional().default("active");

export const adminVehicleMakeListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  state: stateFilter,
});
export type AdminVehicleMakeListQuery = z.infer<typeof adminVehicleMakeListQuerySchema>;

export const adminVehicleModelListQuerySchema = paginationQuerySchema.extend({
  makeId: objectId.optional(),
  bodyType: z.enum(BODY_TYPES).optional(),
  state: stateFilter,
});
export type AdminVehicleModelListQuery = z.infer<typeof adminVehicleModelListQuerySchema>;

export const adminVehicleGenListQuerySchema = paginationQuerySchema.extend({
  modelId: objectId.optional(),
  state: stateFilter,
});
export type AdminVehicleGenListQuery = z.infer<typeof adminVehicleGenListQuerySchema>;

export const adminVehicleEngineListQuerySchema = paginationQuerySchema.extend({
  genId: objectId.optional(),
  fuel: z.enum(FUEL_TYPES).optional(),
  state: stateFilter,
});
export type AdminVehicleEngineListQuery = z.infer<typeof adminVehicleEngineListQuerySchema>;

export const createVehicleMakeSchema = adminCreateVehicleMakeInputSchema;
export const updateVehicleMakeSchema = adminCreateVehicleMakeInputSchema.partial();
export type CreateVehicleMakeInput = z.infer<typeof createVehicleMakeSchema>;
export type UpdateVehicleMakeInput = z.infer<typeof updateVehicleMakeSchema>;

export const createVehicleModelSchema = adminCreateVehicleModelInputSchema;
export const updateVehicleModelSchema = adminCreateVehicleModelInputSchema.partial();
export type CreateVehicleModelInput = z.infer<typeof createVehicleModelSchema>;
export type UpdateVehicleModelInput = z.infer<typeof updateVehicleModelSchema>;

// Not `.partial()`: the year-range refine makes these ZodEffects, which
// has no `.partial()`. The generation form re-sends every field anyway --
// a partial year edit could not be validated against its own counterpart.
export const createVehicleGenSchema = adminCreateVehicleGenInputSchema;
export const updateVehicleGenSchema = adminCreateVehicleGenInputSchema;
export type CreateVehicleGenInput = z.infer<typeof createVehicleGenSchema>;
export type UpdateVehicleGenInput = CreateVehicleGenInput;

export const createVehicleEngineSchema = adminCreateVehicleEngineInputSchema;
export const updateVehicleEngineSchema = adminCreateVehicleEngineInputSchema.partial();
export type CreateVehicleEngineInput = z.infer<typeof createVehicleEngineSchema>;
export type UpdateVehicleEngineInput = z.infer<typeof updateVehicleEngineSchema>;
