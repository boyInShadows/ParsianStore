import { Router } from "express";
import { validateQuery } from "../../middleware/validate.js";
import * as paymentsController from "./payments.controller.js";
import { paymentCallbackQuerySchema } from "./payments.schema.js";

// Deliberately no requireAuth/optionalAuth -- this is the payment
// gateway's own server-to-browser redirect target, not a route a signed-
// in client calls directly. See payments.controller.ts for the real
// security reasoning (the Authority token, not a session cookie, is what
// makes this callback trustworthy).
export const paymentsRouter = Router();

paymentsRouter.get(
  "/callback",
  validateQuery(paymentCallbackQuerySchema),
  paymentsController.paymentCallbackHandler,
);
