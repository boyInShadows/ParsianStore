import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateQuery } from "../../middleware/validate.js";
import * as auditAdminController from "./audit.admin.controller.js";
import { adminAuditListQuerySchema } from "./audit.admin.schema.js";

// P8.S8. The one admin router that is NOT requireStaff(): the audit trail
// records what staff did, so every staff role being able to read it makes
// the trail reviewable by the people it exists to hold accountable.
// Restricted to admin/superadmin instead. No auditLog() middleware -- this
// router is read-only, and it would only ever log itself.
export const adminAuditRouter = Router();
adminAuditRouter.use(requireAuth, requireRole("admin", "superadmin"));

adminAuditRouter.get(
  "/",
  validateQuery(adminAuditListQuerySchema),
  auditAdminController.listAdminAuditLogsHandler,
);
