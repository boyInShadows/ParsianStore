import { Router } from "express";
import { adminAttributesRouter } from "./attributes.admin.routes.js";
import { adminBrandsRouter } from "./brands.admin.routes.js";
import { adminCategoriesRouter } from "./categories.admin.routes.js";

// requireAuth/requireStaff/auditLog are applied per-entity router (each
// needs its own entity name for the audit log), not here.
export const adminCatalogRouter = Router();

adminCatalogRouter.use("/categories", adminCategoriesRouter);
adminCatalogRouter.use("/brands", adminBrandsRouter);
adminCatalogRouter.use("/attributes", adminAttributesRouter);
