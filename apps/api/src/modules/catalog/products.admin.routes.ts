import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/auditLog.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as productsAdminController from "./products.admin.controller.js";
import {
  adminProductIdParamSchema,
  adminProductListQuerySchema,
  createProductSchema,
  updateProductSchema,
  removeProductMediaSchema,
} from "./products.admin.schema.js";

// P8.S2: same requireStaff()+auditLog convention every other admin
// router in this module already uses (categories/brands/attributes).
export const adminProductsRouter = Router();
adminProductsRouter.use(requireAuth, requireStaff(), auditLog("product"));

adminProductsRouter.get(
  "/",
  validateQuery(adminProductListQuerySchema),
  productsAdminController.listAdminProductsHandler,
);
adminProductsRouter.post("/import", productsAdminController.importProductsHandler);
adminProductsRouter.get(
  "/:id",
  validateParams(adminProductIdParamSchema),
  productsAdminController.getAdminProductHandler,
);
adminProductsRouter.post(
  "/",
  validate(createProductSchema),
  productsAdminController.createProductHandler,
);
adminProductsRouter.post(
  "/:id/media",
  validateParams(adminProductIdParamSchema),
  productsAdminController.addProductMediaHandler,
);
adminProductsRouter.delete(
  "/:id/media",
  validateParams(adminProductIdParamSchema),
  validate(removeProductMediaSchema),
  productsAdminController.removeProductMediaHandler,
);
adminProductsRouter.patch(
  "/:id",
  validateParams(adminProductIdParamSchema),
  validate(updateProductSchema),
  productsAdminController.updateProductHandler,
);
adminProductsRouter.post(
  "/:id/archive",
  validateParams(adminProductIdParamSchema),
  productsAdminController.archiveProductHandler,
);
