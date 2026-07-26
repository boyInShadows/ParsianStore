import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams } from "../../middleware/validate.js";
import * as categoriesController from "./categories.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./categories.schema.js";

export const adminCategoriesRouter = Router();

adminCategoriesRouter.use(requireAuth, requireStaff(), auditLog("category"));

adminCategoriesRouter.post(
  "/",
  validate(createCategorySchema),
  categoriesController.createCategoryHandler,
);
adminCategoriesRouter.patch(
  "/:id",
  validateParams(categoryIdParamSchema),
  validate(updateCategorySchema),
  categoriesController.updateCategoryHandler,
);
adminCategoriesRouter.delete(
  "/:id",
  validateParams(categoryIdParamSchema),
  categoriesController.deleteCategoryHandler,
);
