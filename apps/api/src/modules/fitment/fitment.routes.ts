import { Router } from "express";
import { optionalAuth } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import * as fitmentController from "./fitment.controller.js";
import { fitmentCheckQuerySchema, fitmentProductsQuerySchema } from "./fitment.schema.js";

export const fitmentRouter = Router();

// Same precedent as catalogRouter: `/products` now resolves the effective
// price through pricing.ts, which needs `req.user?.accountType` to decide
// between the retail and wholesale number. Without this a wholesale customer
// browsing by vehicle saw retail prices while the identical product on the
// PLP showed theirs -- true under Mongo too, and invisible because the old
// code returned the raw document instead of a priced DTO.
fitmentRouter.use(optionalAuth);

fitmentRouter.get(
  "/check",
  validateQuery(fitmentCheckQuerySchema),
  fitmentController.checkFitmentHandler,
);
fitmentRouter.get(
  "/products",
  validateQuery(fitmentProductsQuerySchema),
  fitmentController.listFittingProductsHandler,
);
