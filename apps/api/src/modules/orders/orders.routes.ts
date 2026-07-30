import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import * as ordersController from "./orders.controller.js";
import { listOrdersQuerySchema, orderCodeParamSchema } from "./orders.schema.js";

// requireAuth on the whole router -- an order is always tied to a real
// signed-in user (checkout is auth-only, P6.S2's decision), same style
// as wishlistRouter/addressesRouter/checkoutRouter.
export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get("/", validateQuery(listOrdersQuerySchema), ordersController.listOrdersHandler);
ordersRouter.get("/:code", validateParams(orderCodeParamSchema), ordersController.getOrderHandler);
