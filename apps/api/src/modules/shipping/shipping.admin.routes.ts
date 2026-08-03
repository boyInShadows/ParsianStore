import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as shippingAdminController from "./shipping.admin.controller.js";
import {
  adminShippingRateIdParamSchema,
  adminShippingRateListQuerySchema,
  createShippingRateSchema,
  updateShippingRateSchema,
} from "./shipping.admin.schema.js";

// P8.S9: masterPlan §5's "/admin/shipping — methods & zones". The courier
// method list itself stays a static const (schemas/shipping.ts explains
// why); what staff actually need to change is the per-zone weight/price
// ladder, which is a real collection.
export const adminShippingRouter = Router();
adminShippingRouter.use(requireAuth, requireStaff(), auditLog("shipping"));

adminShippingRouter.get(
  "/rates",
  validateQuery(adminShippingRateListQuerySchema),
  shippingAdminController.listAdminShippingRatesHandler,
);
adminShippingRouter.get(
  "/rates/:id",
  validateParams(adminShippingRateIdParamSchema),
  shippingAdminController.getAdminShippingRateHandler,
);
adminShippingRouter.post(
  "/rates",
  validate(createShippingRateSchema),
  shippingAdminController.createShippingRateHandler,
);
adminShippingRouter.patch(
  "/rates/:id",
  validateParams(adminShippingRateIdParamSchema),
  validate(updateShippingRateSchema),
  shippingAdminController.updateShippingRateHandler,
);
adminShippingRouter.delete(
  "/rates/:id",
  validateParams(adminShippingRateIdParamSchema),
  shippingAdminController.deleteShippingRateHandler,
);
adminShippingRouter.post(
  "/rates/:id/restore",
  validateParams(adminShippingRateIdParamSchema),
  shippingAdminController.restoreShippingRateHandler,
);
