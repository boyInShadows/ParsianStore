import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as categoriesAdminController from "./categories.admin.controller.js";
import {
  adminCategoryIdParamSchema,
  adminCategoryListQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from "./categories.admin.schema.js";

export const adminCategoriesRouter = Router();

adminCategoriesRouter.use(requireAuth, requireStaff(), auditLog("category"));

// P8.S4 adds the reads. The public /catalog/categories list is shopper-
// shaped and cannot express `state=deleted` or the per-row usage counts —
// both of which this screen needs before it can safely offer a delete
// button — and there was no by-id read anywhere, which every other admin
// edit surface in this codebase is keyed on.
adminCategoriesRouter.get(
  "/",
  validateQuery(adminCategoryListQuerySchema),
  categoriesAdminController.listAdminCategoriesHandler,
);
adminCategoriesRouter.get(
  "/:id",
  validateParams(adminCategoryIdParamSchema),
  categoriesAdminController.getAdminCategoryHandler,
);
adminCategoriesRouter.post(
  "/",
  validate(createCategorySchema),
  categoriesAdminController.createCategoryHandler,
);
adminCategoriesRouter.patch(
  "/:id",
  validateParams(adminCategoryIdParamSchema),
  validate(updateCategorySchema),
  categoriesAdminController.updateCategoryHandler,
);
adminCategoriesRouter.delete(
  "/:id",
  validateParams(adminCategoryIdParamSchema),
  categoriesAdminController.deleteCategoryHandler,
);
// A named action, not a verb-overloaded PATCH — matching products/:id/archive
// and coupons/:id/deactivate. Being a write, auditLog covers it for free.
adminCategoriesRouter.post(
  "/:id/restore",
  validateParams(adminCategoryIdParamSchema),
  categoriesAdminController.restoreCategoryHandler,
);
