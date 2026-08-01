import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/auditLog.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as usersAdminController from "./users.admin.controller.js";
import {
  adminCustomerListQuerySchema,
  adminUserIdParamSchema,
  setAccountTypeSchema,
} from "./users.admin.schema.js";

// P8.S3: the first admin surface over User. Deliberately read-only
// except for the one field the set-account-type script already wrote --
// staff-role management is its own later RBAC step, and nothing here
// may touch a password, phone, or role.
export const adminCustomersRouter = Router();
adminCustomersRouter.use(requireAuth, requireStaff(), auditLog("customer"));

adminCustomersRouter.get(
  "/",
  validateQuery(adminCustomerListQuerySchema),
  usersAdminController.listAdminCustomersHandler,
);
adminCustomersRouter.get(
  "/:id",
  validateParams(adminUserIdParamSchema),
  usersAdminController.getAdminCustomerHandler,
);
adminCustomersRouter.patch(
  "/:id/account-type",
  validateParams(adminUserIdParamSchema),
  validate(setAccountTypeSchema),
  usersAdminController.setAccountTypeHandler,
);
