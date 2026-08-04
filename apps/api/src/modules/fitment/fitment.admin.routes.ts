import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as fitmentAdminController from "./fitment.admin.controller.js";
import {
  adminFitmentIdParamSchema,
  adminFitmentListQuerySchema,
  createFitmentSchema,
  updateFitmentSchema,
} from "./fitment.admin.schema.js";

// P8.S6 §3.7 "Fitment Manager". Separate from the public fitmentRouter
// (which only ever answers "does this product fit this car?") -- this is
// the write side those answers are computed from.
export const adminFitmentRouter = Router();
adminFitmentRouter.use(requireAuth, requireStaff(), auditLog("fitment"));

adminFitmentRouter.get(
  "/",
  validateQuery(adminFitmentListQuerySchema),
  fitmentAdminController.listAdminFitmentsHandler,
);
adminFitmentRouter.get(
  "/:id",
  validateParams(adminFitmentIdParamSchema),
  fitmentAdminController.getAdminFitmentHandler,
);
adminFitmentRouter.post(
  "/",
  validate(createFitmentSchema),
  fitmentAdminController.createFitmentHandler,
);
adminFitmentRouter.patch(
  "/:id",
  validateParams(adminFitmentIdParamSchema),
  validate(updateFitmentSchema),
  fitmentAdminController.updateFitmentHandler,
);
adminFitmentRouter.delete(
  "/:id",
  validateParams(adminFitmentIdParamSchema),
  fitmentAdminController.deleteFitmentHandler,
);
adminFitmentRouter.post(
  "/:id/restore",
  validateParams(adminFitmentIdParamSchema),
  fitmentAdminController.restoreFitmentHandler,
);
