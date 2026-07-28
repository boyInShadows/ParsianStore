import { Router } from "express";
import { validateQuery } from "../../middleware/validate.js";
import { brandsRouter } from "./brands.routes.js";
import { categoriesRouter } from "./categories.routes.js";
import { productsRouter } from "./products.routes.js";
import * as searchController from "./search.controller.js";
import { facetsQuerySchema, searchProductsQuerySchema } from "./search.schema.js";

export const catalogRouter = Router();

catalogRouter.use("/categories", categoriesRouter);
catalogRouter.use("/brands", brandsRouter);
catalogRouter.use("/products", productsRouter);
catalogRouter.get(
  "/search",
  validateQuery(searchProductsQuerySchema),
  searchController.searchProductsHandler,
);
catalogRouter.get("/facets", validateQuery(facetsQuerySchema), searchController.getFacetsHandler);
