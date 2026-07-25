import { AuditLogModel } from "../models/AuditLog.js";

export interface AuditLogEntry {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

/**
 * The single write path for AuditLog (§10: "admin writes audit-logged").
 * Called two ways: automatically by the auditLog() middleware for the
 * generic facts every write has (actor/action/entity/ip), and directly by
 * services that have real before/after state to record once actual admin
 * CRUD exists (Phase 8) — a generic middleware can't know what a specific
 * domain write actually changed.
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  await AuditLogModel.create(entry);
}
