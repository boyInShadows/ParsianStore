import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import * as wishlistController from "./wishlist.controller.js";
import { wishlistListQuerySchema, wishlistProductParamSchema } from "./wishlist.schema.js";

// Every route here needs a signed-in user -- no role check (that's rbac's
// job for staff-only routes), just "is there a valid session." No
// auditLog: that middleware is exclusively an admin-write convention today
// (see middleware/auditLog.ts's own doc comment) -- a customer saving/
// unsaving their own product is a self-service action, not an admin write.
export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get(
  "/",
  validateQuery(wishlistListQuerySchema),
  wishlistController.listWishlistHandler,
);
wishlistRouter.post(
  "/:productId",
  validateParams(wishlistProductParamSchema),
  wishlistController.addToWishlistHandler,
);
wishlistRouter.delete(
  "/:productId",
  validateParams(wishlistProductParamSchema),
  wishlistController.removeFromWishlistHandler,
);
