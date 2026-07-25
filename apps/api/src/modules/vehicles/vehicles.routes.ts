import { Router } from "express";
import { validateQuery } from "../../middleware/validate.js";
import * as vehiclesController from "./vehicles.controller.js";
import {
  listEnginesQuerySchema,
  listGenerationsQuerySchema,
  listMakesQuerySchema,
  listModelsQuerySchema,
} from "./vehicles.schema.js";

export const vehiclesRouter = Router();

vehiclesRouter.get(
  "/makes",
  validateQuery(listMakesQuerySchema),
  vehiclesController.listMakesHandler,
);
vehiclesRouter.get(
  "/models",
  validateQuery(listModelsQuerySchema),
  vehiclesController.listModelsHandler,
);
vehiclesRouter.get(
  "/generations",
  validateQuery(listGenerationsQuerySchema),
  vehiclesController.listGenerationsHandler,
);
vehiclesRouter.get(
  "/engines",
  validateQuery(listEnginesQuerySchema),
  vehiclesController.listEnginesHandler,
);
