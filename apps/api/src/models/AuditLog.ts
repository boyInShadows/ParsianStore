import { Schema, model, type Types } from "mongoose";
import type { WithTimestamps } from "./plugins.js";
import { timestampsPlugin } from "./plugins.js";

export interface AuditLog extends WithTimestamps {
  actorId: Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

const auditLogSchema = new Schema<AuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, required: true },
  entity: { type: String, required: true, index: true },
  entityId: { type: String },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  ip: { type: String },
});

// Deliberately no soft-delete/toJSON plugins: an audit trail that could be
// "soft-deleted" through the normal per-model path would defeat its own
// purpose, and these records are never shaped for direct client display.
timestampsPlugin(auditLogSchema);

export const AuditLogModel = model<AuditLog>("AuditLog", auditLogSchema);
