import { z } from "zod";
import { ADMIN_FITMENT_CONFIDENCES, adminCreateFitmentInputSchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const adminFitmentIdParamSchema = z.object({ id: objectId });

export const adminFitmentListQuerySchema = paginationQuerySchema.extend({
  productId: objectId.optional(),
  makeId: objectId.optional(),
  modelId: objectId.optional(),
  genId: objectId.optional(),
  confidence: z.enum(ADMIN_FITMENT_CONFIDENCES).optional(),
  state: z.enum(["active", "deleted"]).optional().default("active"),
});
export type AdminFitmentListQuery = z.infer<typeof adminFitmentListQuerySchema>;

export const createFitmentSchema = adminCreateFitmentInputSchema;
// Not `.partial()`: the two refines make this a ZodEffects, and a partial
// year/engine edit could not be checked against its own counterpart.
export const updateFitmentSchema = adminCreateFitmentInputSchema;
export type CreateFitmentInput = z.infer<typeof createFitmentSchema>;
export type UpdateFitmentInput = CreateFitmentInput;
