import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as brandsAdminController from "./brands.admin.controller.js";
import {
  adminBrandIdParamSchema,
  adminBrandListQuerySchema,
  createBrandSchema,
  updateBrandSchema,
} from "./brands.admin.schema.js";

export const adminBrandsRouter = Router();

adminBrandsRouter.use(requireAuth, requireStaff(), auditLog("brand"));

// P8.S4 adds the reads — see categories.admin.routes.ts for why these are
// real admin endpoints rather than a reuse of the public /catalog/brands.
adminBrandsRouter.get(
  "/",
  validateQuery(adminBrandListQuerySchema),
  brandsAdminController.listAdminBrandsHandler,
);
adminBrandsRouter.get(
  "/:id",
  validateParams(adminBrandIdParamSchema),
  brandsAdminController.getAdminBrandHandler,
);
adminBrandsRouter.post("/", validate(createBrandSchema), brandsAdminController.createBrandHandler);
adminBrandsRouter.patch(
  "/:id",
  validateParams(adminBrandIdParamSchema),
  validate(updateBrandSchema),
  brandsAdminController.updateBrandHandler,
);
adminBrandsRouter.delete(
  "/:id",
  validateParams(adminBrandIdParamSchema),
  brandsAdminController.deleteBrandHandler,
);
adminBrandsRouter.post(
  "/:id/restore",
  validateParams(adminBrandIdParamSchema),
  brandsAdminController.restoreBrandHandler,
);
