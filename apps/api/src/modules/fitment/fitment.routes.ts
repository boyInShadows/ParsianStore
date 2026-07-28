import { Router } from "express";
import { validateQuery } from "../../middleware/validate.js";
import * as fitmentController from "./fitment.controller.js";
import { fitmentCheckQuerySchema, fitmentProductsQuerySchema } from "./fitment.schema.js";

export const fitmentRouter = Router();

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
