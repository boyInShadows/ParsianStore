import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validateQuery } from "../../middleware/validate.js";
import * as dashboardAdminController from "./dashboard.admin.controller.js";
import { adminDashboardQuerySchema } from "./dashboard.admin.schema.js";

// P8.S5: read-only by definition -- this surface aggregates, it never
// writes, so no `auditLog(...)` here (that middleware only ever records
// POST/PUT/PATCH/DELETE and would be dead weight on a GET-only router).
export const adminDashboardRouter = Router();
adminDashboardRouter.use(requireAuth, requireStaff());

adminDashboardRouter.get(
  "/",
  validateQuery(adminDashboardQuerySchema),
  dashboardAdminController.getAdminDashboardHandler,
);
