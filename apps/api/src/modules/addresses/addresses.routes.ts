import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate, validateParams } from "../../middleware/validate.js";
import * as addressesController from "./addresses.controller.js";
import { addressIdParamSchema, addressInputSchema } from "./addresses.schema.js";

// requireAuth, not optionalAuth -- P6.S1's own decision: checkout is
// auth-only, no guest identity, so an address book has no meaningful
// guest concept at all (unlike Cart). No auditLog: a customer managing
// their own addresses is self-service, same reasoning Cart/Wishlist
// already established -- that middleware is an admin-write convention.
export const addressesRouter = Router();
addressesRouter.use(requireAuth);

addressesRouter.get("/", addressesController.listAddressesHandler);
addressesRouter.post("/", validate(addressInputSchema), addressesController.createAddressHandler);
addressesRouter.patch(
  "/:id",
  validateParams(addressIdParamSchema),
  validate(addressInputSchema),
  addressesController.updateAddressHandler,
);
addressesRouter.delete(
  "/:id",
  validateParams(addressIdParamSchema),
  addressesController.deleteAddressHandler,
);
