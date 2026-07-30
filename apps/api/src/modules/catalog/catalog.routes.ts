import { Router } from "express";
import { optionalAuth } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { brandsRouter } from "./brands.routes.js";
import { categoriesRouter } from "./categories.routes.js";
import { productsRouter } from "./products.routes.js";
import * as searchController from "./search.controller.js";
import { facetsQuerySchema, searchProductsQuerySchema } from "./search.schema.js";

export const catalogRouter = Router();

// P6.S1: needed so req.user?.accountType is available for products.
// controller.ts/search.controller.ts to resolve wholesale pricing --
// same optionalAuth precedent as cartRouter. /categories, /brands, and
// /facets don't use req.user at all, this is harmless for them.
catalogRouter.use(optionalAuth);

catalogRouter.use("/categories", categoriesRouter);
catalogRouter.use("/brands", brandsRouter);
catalogRouter.use("/products", productsRouter);
catalogRouter.get(
  "/search",
  validateQuery(searchProductsQuerySchema),
  searchController.searchProductsHandler,
);
catalogRouter.get("/facets", validateQuery(facetsQuerySchema), searchController.getFacetsHandler);
