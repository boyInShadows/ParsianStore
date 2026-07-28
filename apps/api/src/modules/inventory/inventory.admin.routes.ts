import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateQuery } from "../../middleware/validate.js";
import * as inventoryController from "./inventory.controller.js";
import { adjustStockSchema, listLowStockQuerySchema } from "./inventory.schema.js";

export const adminInventoryRouter = Router();

adminInventoryRouter.use(requireAuth, requireStaff(), auditLog("inventory"));

adminInventoryRouter.post(
  "/adjust",
  validate(adjustStockSchema),
  inventoryController.adjustStockHandler,
);
adminInventoryRouter.get(
  "/low-stock",
  validateQuery(listLowStockQuerySchema),
  inventoryController.listLowStockHandler,
);
