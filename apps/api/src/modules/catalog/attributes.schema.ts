import { z } from "zod";
import {
  ATTRIBUTE_TYPES,
  adminCreateAttributeInputSchema,
  adminUpdateAttributeInputSchema,
} from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const listAttributesQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  type: z.enum(ATTRIBUTE_TYPES).optional(),
  state: z.enum(["active", "deleted"]).optional().default("active"),
});
export type ListAttributesQuery = z.infer<typeof listAttributesQuerySchema>;

export const attributeIdParamSchema = z.object({ id: objectId });

// This module is admin-only end to end (no public /catalog/attributes route
// exists), so unlike categories/brands it keeps a single schema file — but
// the input shapes still live in packages/schemas so apps/web's form
// validates against the same rules and Persian messages.
export const createAttributeSchema = adminCreateAttributeInputSchema;
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;

export const updateAttributeSchema = adminUpdateAttributeInputSchema;
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;
