import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

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
 *
 * `actorId` is a real foreign key now. In the app it always resolves — the
 * value comes from a verified access token, which was minted for a user that
 * exists. A test signing a token for an invented subject is the one case where
 * it does not, and the middleware's own `.catch()` swallows that violation the
 * same way it already swallowed every other write failure.
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      // `Prisma.DbNull`, not a bare `null`: on a Json column `null` means "the
      // JSON value null", and these two are absent far more often than they
      // are genuinely null.
      before: entry.before === undefined ? Prisma.DbNull : (entry.before as Prisma.InputJsonValue),
      after: entry.after === undefined ? Prisma.DbNull : (entry.after as Prisma.InputJsonValue),
      ip: entry.ip ?? null,
    },
  });
}
