import { z } from "zod";

// P8.S8: the read side of the AuditLog collection the auditLog()
// middleware has been writing since P8.S1. Own file, same bundle-budget
// reasoning as every other admin-*.ts schema.

/**
 * Every entity name currently passed to `auditLog(...)` on the API side.
 * Used to populate the filter, so staff pick from what actually exists
 * instead of typing a guess. A record whose entity is not in this list
 * still lists and still filters -- the API never validates against it.
 */
export const AUDIT_ENTITIES = [
  "order",
  "product",
  "inventory",
  "category",
  "brand",
  "attribute",
  "coupon",
  "customer",
] as const;
export type AuditEntityDto = (typeof AUDIT_ENTITIES)[number];

export const AUDIT_METHODS = ["POST", "PATCH", "PUT", "DELETE"] as const;
export type AuditMethodDto = (typeof AUDIT_METHODS)[number];

export const adminAuditLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  // Resolved from the referenced User. Nullable rather than optional: a
  // deleted staff account must still show its entries -- an audit trail
  // that hides what a since-removed admin did defeats its own purpose.
  actorName: z.string().nullable(),
  actorPhone: z.string().nullable(),
  actorRole: z.string().nullable(),
  // Stored as "<METHOD> <path>" by the middleware. Split here so the UI
  // can style the verb without re-parsing the string in three places.
  method: z.string(),
  path: z.string(),
  entity: z.string(),
  entityId: z.string().optional(),
  ip: z.string().optional(),
  // Only services with real domain state populate these (utils/auditLog.ts);
  // the generic middleware cannot, so most rows have neither.
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  createdAt: z.string(),
});
export type AdminAuditLogDto = z.infer<typeof adminAuditLogSchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminAuditLogListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminAuditLogSchema),
  meta: paginationMetaSchema,
});
