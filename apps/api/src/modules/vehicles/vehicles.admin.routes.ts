import { Router, type RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { auditLog } from "../../middleware/auditLog.js";
import { requireStaff } from "../../middleware/rbac.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as controller from "./vehicles.admin.controller.js";
import {
  adminVehicleEngineListQuerySchema,
  adminVehicleGenListQuerySchema,
  adminVehicleIdParamSchema,
  adminVehicleMakeListQuerySchema,
  adminVehicleModelListQuerySchema,
  createVehicleEngineSchema,
  createVehicleGenSchema,
  createVehicleMakeSchema,
  createVehicleModelSchema,
  updateVehicleEngineSchema,
  updateVehicleGenSchema,
  updateVehicleMakeSchema,
  updateVehicleModelSchema,
} from "./vehicles.admin.schema.js";

// P8.S6 §3.7. One sub-router per entity so each carries its own audit
// entity name -- the same per-entity structure catalog.admin.routes.ts
// established, rather than one router logging everything as "vehicle".
function entityRouter(options: {
  entity: string;
  listQuery: ZodTypeAny;
  create: ZodTypeAny;
  update: ZodTypeAny;
  handlers: {
    list: RequestHandler;
    create: RequestHandler;
    update: RequestHandler;
    remove: RequestHandler;
    restore: RequestHandler;
  };
}): Router {
  const router = Router();
  router.use(requireAuth, requireStaff(), auditLog(options.entity));

  router.get("/", validateQuery(options.listQuery), options.handlers.list);
  router.post("/", validate(options.create), options.handlers.create);
  router.patch(
    "/:id",
    validateParams(adminVehicleIdParamSchema),
    validate(options.update),
    options.handlers.update,
  );
  router.delete("/:id", validateParams(adminVehicleIdParamSchema), options.handlers.remove);
  router.post("/:id/restore", validateParams(adminVehicleIdParamSchema), options.handlers.restore);
  return router;
}

export const adminVehiclesRouter = Router();

adminVehiclesRouter.use(
  "/makes",
  entityRouter({
    entity: "vehicle-make",
    listQuery: adminVehicleMakeListQuerySchema,
    create: createVehicleMakeSchema,
    update: updateVehicleMakeSchema,
    handlers: controller.makes,
  }),
);
adminVehiclesRouter.use(
  "/models",
  entityRouter({
    entity: "vehicle-model",
    listQuery: adminVehicleModelListQuerySchema,
    create: createVehicleModelSchema,
    update: updateVehicleModelSchema,
    handlers: controller.models,
  }),
);
adminVehiclesRouter.use(
  "/generations",
  entityRouter({
    entity: "vehicle-generation",
    listQuery: adminVehicleGenListQuerySchema,
    create: createVehicleGenSchema,
    update: updateVehicleGenSchema,
    handlers: controller.generations,
  }),
);
adminVehiclesRouter.use(
  "/engines",
  entityRouter({
    entity: "vehicle-engine",
    listQuery: adminVehicleEngineListQuerySchema,
    create: createVehicleEngineSchema,
    update: updateVehicleEngineSchema,
    handlers: controller.engines,
  }),
);
