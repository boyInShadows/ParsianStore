import { Router } from "express";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import * as categoriesController from "./categories.controller.js";
import { categorySlugParamSchema, listCategoriesQuerySchema } from "./categories.schema.js";

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  validateQuery(listCategoriesQuerySchema),
  categoriesController.listCategoriesHandler,
);
categoriesRouter.get(
  "/:slug",
  validateParams(categorySlugParamSchema),
  categoriesController.getCategoryBySlugHandler,
);
