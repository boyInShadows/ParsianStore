import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/auditLog.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as ordersAdminController from "./orders.admin.controller.js";
import {
  adminOrderIdParamSchema,
  adminOrderListQuerySchema,
  updateOrderStatusSchema,
} from "./orders.admin.schema.js";

// P8.S1: first Phase 8 piece. Any staff role (requireStaff()) — same
// convention every other admin router already uses (catalog, inventory);
// no finer-grained "warehouse"/"fulfillment" role exists yet to justify a
// narrower check. auditLog("order") only fires on writes (the PATCH), same
// as every other admin router mounting it broadly on `.use()`.
export const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAuth, requireStaff(), auditLog("order"));

adminOrdersRouter.get(
  "/",
  validateQuery(adminOrderListQuerySchema),
  ordersAdminController.listOrdersHandler,
);
adminOrdersRouter.get(
  "/:id",
  validateParams(adminOrderIdParamSchema),
  ordersAdminController.getOrderHandler,
);
adminOrdersRouter.patch(
  "/:id/status",
  validateParams(adminOrderIdParamSchema),
  validate(updateOrderStatusSchema),
  ordersAdminController.updateOrderStatusHandler,
);
