import { Router } from "express";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import * as productsController from "./products.controller.js";
import {
  listProductsQuerySchema,
  productSlugParamSchema,
  relatedProductsQuerySchema,
} from "./products.schema.js";

export const productsRouter = Router();

productsRouter.get(
  "/",
  validateQuery(listProductsQuerySchema),
  productsController.listProductsHandler,
);
productsRouter.get(
  "/:slug/related",
  validateParams(productSlugParamSchema),
  validateQuery(relatedProductsQuerySchema),
  productsController.getRelatedProductsHandler,
);
productsRouter.get(
  "/:slug",
  validateParams(productSlugParamSchema),
  productsController.getProductBySlugHandler,
);
