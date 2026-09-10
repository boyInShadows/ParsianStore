import { z } from "zod";
import { adminSetAccountTypeInputSchema, accountTypeSchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const adminUserIdParamSchema = z.object({ id: objectId });
export type AdminUserIdParam = z.infer<typeof adminUserIdParamSchema>;

export const adminCustomerListQuerySchema = paginationQuerySchema.extend({
  // Free-text phone fragment. Normalized server-side -- staff type
  // "0912..." but the DB stores "+98912..." (see users.admin.service.ts).
  phone: z.string().optional(),
  accountType: accountTypeSchema.optional(),
});
export type AdminCustomerListQuery = z.infer<typeof adminCustomerListQuerySchema>;

export const setAccountTypeSchema = adminSetAccountTypeInputSchema;
export type SetAccountTypeInput = z.infer<typeof setAccountTypeSchema>;
