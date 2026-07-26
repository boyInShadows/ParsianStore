import { Router } from "express";
import { validateQuery } from "../../middleware/validate.js";
import * as geoController from "./geo.controller.js";
import { listCitiesQuerySchema, listProvincesQuerySchema } from "./geo.schema.js";

export const geoRouter = Router();

geoRouter.get(
  "/provinces",
  validateQuery(listProvincesQuerySchema),
  geoController.listProvincesHandler,
);
geoRouter.get("/cities", validateQuery(listCitiesQuerySchema), geoController.listCitiesHandler);
