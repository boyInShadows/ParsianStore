import { z } from "zod";
import { AUDIT_METHODS } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const adminAuditListQuerySchema = paginationQuerySchema.extend({
  // Not validated against AUDIT_ENTITIES: that list is a UI convenience,
  // and a row written by a router this build does not know about must
  // still be filterable rather than rejected at the boundary.
  entity: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
  actorId: objectId.optional(),
  method: z.enum(AUDIT_METHODS).optional(),
  // ISO datetimes. Storage is UTC ISO everywhere (CLAUDE.md rule 9), so
  // the client sends the same -- never a Jalali string.
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;
