import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as attributesController from "./attributes.controller.js";
import {
  attributeIdParamSchema,
  createAttributeSchema,
  listAttributesQuerySchema,
  updateAttributeSchema,
} from "./attributes.schema.js";

// No public /catalog/attributes route exists (§9) — attributes are an
// internal building block for Product.attributes[{key,value}] and PLP
// facets, not something a shopper browses directly. Every route here is
// admin-only.
export const adminAttributesRouter = Router();

adminAttributesRouter.use(requireAuth, requireStaff(), auditLog("attribute"));

adminAttributesRouter.get(
  "/",
  validateQuery(listAttributesQuerySchema),
  attributesController.listAttributesHandler,
);
adminAttributesRouter.post(
  "/",
  validate(createAttributeSchema),
  attributesController.createAttributeHandler,
);
adminAttributesRouter.patch(
  "/:id",
  validateParams(attributeIdParamSchema),
  validate(updateAttributeSchema),
  attributesController.updateAttributeHandler,
);
adminAttributesRouter.delete(
  "/:id",
  validateParams(attributeIdParamSchema),
  attributesController.deleteAttributeHandler,
);
