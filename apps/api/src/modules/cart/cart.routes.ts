import { Router } from "express";
import { optionalAuth } from "../../middleware/auth.js";
import { validate, validateParams } from "../../middleware/validate.js";
import * as cartController from "./cart.controller.js";
import { addItemSchema, cartItemIdParamSchema, updateItemSchema } from "./cart.schema.js";

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
