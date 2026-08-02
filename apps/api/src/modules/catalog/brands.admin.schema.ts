import { z } from "zod";
import { adminCreateBrandInputSchema, adminUpdateBrandInputSchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const adminBrandIdParamSchema = z.object({ id: objectId });

export const adminBrandListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  // Query strings are strings; z.coerce.boolean() would turn "false" into
  // true, so the two literals are matched explicitly.
  isOEM: z.enum(["true", "false"]).optional(),
  state: z.enum(["active", "deleted"]).optional().default("active"),
});
export type AdminBrandListQuery = z.infer<typeof adminBrandListQuerySchema>;

export const createBrandSchema = adminCreateBrandInputSchema;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = adminUpdateBrandInputSchema;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
