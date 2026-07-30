import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as checkoutController from "./checkout.controller.js";
import { initiateCheckoutSchema } from "./checkout.schema.js";

// requireAuth on the whole router -- checkout is auth-only (P6.S2's own
// decision), unlike cartRouter which must also serve guests.
export const checkoutRouter = Router();

checkoutRouter.post(
  "/initiate",
  requireAuth,
  validate(initiateCheckoutSchema),
  checkoutController.initiateCheckoutHandler,
);
