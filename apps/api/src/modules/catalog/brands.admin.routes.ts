import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams } from "../../middleware/validate.js";
import * as brandsController from "./brands.controller.js";
import { brandIdParamSchema, createBrandSchema, updateBrandSchema } from "./brands.schema.js";

export const adminBrandsRouter = Router();

adminBrandsRouter.use(requireAuth, requireStaff(), auditLog("brand"));

adminBrandsRouter.post("/", validate(createBrandSchema), brandsController.createBrandHandler);
adminBrandsRouter.patch(
  "/:id",
  validateParams(brandIdParamSchema),
  validate(updateBrandSchema),
  brandsController.updateBrandHandler,
);
adminBrandsRouter.delete(
  "/:id",
  validateParams(brandIdParamSchema),
  brandsController.deleteBrandHandler,
);
