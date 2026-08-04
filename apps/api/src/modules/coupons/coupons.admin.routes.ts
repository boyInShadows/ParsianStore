import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/auditLog.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as couponsAdminController from "./coupons.admin.controller.js";
import {
  adminCouponIdParamSchema,
  adminCouponListQuerySchema,
  createCouponSchema,
  updateCouponSchema,
} from "./coupons.admin.schema.js";

// P8.S3: same requireAuth+requireStaff()+auditLog stack every other
// admin router uses. Mounted at its own top-level /admin/coupons rather
// than inside adminCatalogRouter -- a coupon is not a catalog entity,
// and /admin/orders and /admin/inventory already establish that
// non-catalog admin resources get their own mount.
export const adminCouponsRouter = Router();
adminCouponsRouter.use(requireAuth, requireStaff(), auditLog("coupon"));

adminCouponsRouter.get(
  "/",
  validateQuery(adminCouponListQuerySchema),
  couponsAdminController.listAdminCouponsHandler,
);
adminCouponsRouter.get(
  "/:id",
  validateParams(adminCouponIdParamSchema),
  couponsAdminController.getAdminCouponHandler,
);
adminCouponsRouter.post(
  "/",
  validate(createCouponSchema),
  couponsAdminController.createCouponHandler,
);
adminCouponsRouter.patch(
  "/:id",
  validateParams(adminCouponIdParamSchema),
  validate(updateCouponSchema),
  couponsAdminController.updateCouponHandler,
);
// POST /:id/deactivate, not DELETE -- same "soft-retire via a named
// action" convention products.admin.routes.ts's /:id/archive follows.
// The redemption record (usedCount, and every Order that snapshotted
// this code) must survive.
adminCouponsRouter.post(
  "/:id/deactivate",
  validateParams(adminCouponIdParamSchema),
  couponsAdminController.deactivateCouponHandler,
);
