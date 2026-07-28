import { Router } from "express";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import * as brandsController from "./brands.controller.js";
import { brandSlugParamSchema, listBrandsQuerySchema } from "./brands.schema.js";

export const brandsRouter = Router();

brandsRouter.get("/", validateQuery(listBrandsQuerySchema), brandsController.listBrandsHandler);
brandsRouter.get(
  "/:slug",
  validateParams(brandSlugParamSchema),
  brandsController.getBrandBySlugHandler,
);
