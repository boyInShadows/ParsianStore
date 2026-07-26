import { Router } from "express";
import { brandsRouter } from "./brands.routes.js";
import { categoriesRouter } from "./categories.routes.js";

export const catalogRouter = Router();

catalogRouter.use("/categories", categoriesRouter);
catalogRouter.use("/brands", brandsRouter);
