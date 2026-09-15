import { z } from "zod";

// §3.4 "My Garage": the active vehicle is reflected in the URL as
// `?v=<vehicleKey>` so results are shareable/crawlable, and §9's
// `/fitment/check?productId&vehicleKey` needs the exact same encoding on
// the API side — one definition, shared, so apps/web and apps/api can
// never drift on the format.
//
// P15.S8b: `VehicleKeyParts`/`buildVehicleKey`/`parseVehicleKey` themselves
// moved to `./vehicleKeyCore.js`, a zod-free module, so the browser's Garage
// widgets can import them without pulling zod into every shop route's
// chrome (`schemas/vehicle-key` is the subpath that resolves there). This
// file re-exports them unchanged so apps/api -- which imports the bare
// `"schemas"` barrel and does not care about browser bundle size -- keeps
// working exactly as before, and adds `vehicleKeySchema`, the one export
// that is genuinely zod-bound and that no web import ever used.
export { buildVehicleKey, parseVehicleKey, type VehicleKeyParts } from "./vehicleKeyCore.js";
import { parseVehicleKey as parseVehicleKeyCore } from "./vehicleKeyCore.js";

/**
 * Zod schema wrapping parseVehicleKey() for the `?vehicleKey=`/`?vehicle=`
 * query params apps/api validates every route through (§9). Shared here
 * rather than redefined per-module (modules/fitment, modules/catalog) so
 * every consumer reports the exact same 400 shape on a malformed key.
 */
export const vehicleKeySchema = z.string().transform((value, ctx) => {
  try {
    return parseVehicleKeyCore(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "کلید خودرو نامعتبر است" });
    return z.NEVER;
  }
});
