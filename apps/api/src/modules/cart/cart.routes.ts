import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { validate, validateParams } from "../../middleware/validate.js";
import * as cartController from "./cart.controller.js";
import {
  addItemSchema,
  cartItemIdParamSchema,
  estimateShippingSchema,
  updateItemSchema,
} from "./cart.schema.js";

// optionalAuth, not requireAuth -- cart must work for a real guest. No
// auditLog (same reasoning as wishlist -- a customer's own cart is a
// self-service action, not an admin write). No custom rate limiter --
// falls under the existing blanket apiRateLimiter (100/min/IP, app.ts).
export const cartRouter = Router();
cartRouter.use(optionalAuth);

cartRouter.get("/", cartController.getCartHandler);
cartRouter.post("/items", validate(addItemSchema), cartController.addItemHandler);
cartRouter.patch(
  "/items/:id",
  validateParams(cartItemIdParamSchema),
  validate(updateItemSchema),
  cartController.updateItemHandler,
);
cartRouter.delete(
  "/items/:id",
  validateParams(cartItemIdParamSchema),
  cartController.removeItemHandler,
);

// P6.S4: requireAuth stacked on top of the router's own optionalAuth --
// checkout is auth-only (P6.S2's decision), and this needs one of the
// caller's own real addresses to resolve a shipping zone from. A harmless
// double cookie-check, not a new middleware pattern.
cartRouter.post(
  "/estimate-shipping",
  requireAuth,
  validate(estimateShippingSchema),
  cartController.estimateShippingHandler,
);
