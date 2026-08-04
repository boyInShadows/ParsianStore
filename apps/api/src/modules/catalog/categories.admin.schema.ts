import { z } from "zod";
import {
  CATALOG_SYSTEM_CODES,
  adminCreateCategoryInputSchema,
  adminUpdateCategoryInputSchema,
} from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const adminCategoryIdParamSchema = z.object({ id: objectId });

// `state` is what makes soft delete reversible from the UI. Without it a
// deleted category is invisible to every query including this one, while
// still occupying the unique index on `slug` — so re-creating it fails with
// a duplicate-key 400 and staff have no way to see why.
export const adminCategoryListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  parentId: objectId.optional(),
  systemCode: z.enum(CATALOG_SYSTEM_CODES).optional(),
  state: z.enum(["active", "deleted"]).optional().default("active"),
});
export type AdminCategoryListQuery = z.infer<typeof adminCategoryListQuerySchema>;

export const createCategorySchema = adminCreateCategoryInputSchema;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = adminUpdateCategoryInputSchema;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
