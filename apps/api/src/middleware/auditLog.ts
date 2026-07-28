import type { RequestHandler } from "express";
import { logger } from "../config/logger.js";
import { recordAuditLog } from "../utils/auditLog.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Generic audit trail for admin writes (§10: "admin writes audit-logged").
 * Records what's genuinely available at this generic layer — actor,
 * action (method + path), entity, entityId (from a route's :id param),
 * ip — for every successful write. Deliberately does NOT attempt to
 * capture before/after diffs: this middleware runs before any handler,
 * so it has no visibility into what a specific domain write actually
 * changes. Services with real before/after state call recordAuditLog()
 * directly instead (see utils/auditLog.ts) once real admin CRUD exists.
 *
 * Mount per-router with the entity name it protects, after requireAuth:
 * `adminRouter.use(requireAuth, requireStaff(), auditLog("product"))`.
 */
export function auditLog(entity: string): RequestHandler {
  return (req, res, next) => {
    if (!WRITE_METHODS.has(req.method)) {
      next();
      return;
    }

    res.on("finish", () => {
      if (!req.user || res.statusCode >= 400) return;
      recordAuditLog({
        actorId: req.user.sub,
        action: `${req.method} ${req.baseUrl}${req.path}`,
        entity,
        entityId: typeof req.params.id === "string" ? req.params.id : undefined,
        ip: req.ip,
      }).catch((err: unknown) => {
        logger.error({ err }, "Failed to record audit log");
      });
    });

    next();
  };
}
