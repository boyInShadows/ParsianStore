import { z } from "zod";
import { idSchema } from "./id.js";

// §3.4 "My Garage": the active vehicle is reflected in the URL as
// `?v=<vehicleKey>` so results are shareable/crawlable, and §9's
// `/fitment/check?productId&vehicleKey` needs the exact same encoding on
// the API side — one definition, shared, so apps/web and apps/api can
// never drift on the format.
export interface VehicleKeyParts {
  makeId: string;
  modelId: string;
  genId: string;
  year: number;
  engineId?: string;
}

// "." stays a safe separator after the move to UUID ids: a UUID's only
// non-alphanumeric character is "-", so no segment can ever contain one.
const SEPARATOR = ".";

function isId(value: string): boolean {
  return idSchema.safeParse(value).success;
}

/** Encodes a Garage entry (§3.2's `{ makeId, modelId, genId, engineId?,
 * year }`) into the compact string carried in `?v=`. */
export function buildVehicleKey(parts: VehicleKeyParts): string {
  const segments = [parts.makeId, parts.modelId, parts.genId, String(parts.year)];
  if (parts.engineId) segments.push(parts.engineId);
  return segments.join(SEPARATOR);
}

/** Inverse of buildVehicleKey(). Throws a plain Error (not an API-specific
 * error type — this module is shared with apps/web) on a malformed key;
 * callers translate that into their own error handling. */
export function parseVehicleKey(key: string): VehicleKeyParts {
  const segments = key.split(SEPARATOR);
  if (segments.length !== 4 && segments.length !== 5) {
    throw new Error("کلید خودرو نامعتبر است");
  }

  const [makeId, modelId, genId, yearRaw, engineId] = segments as [
    string,
    string,
    string,
    string,
    string | undefined,
  ];
  const year = Number(yearRaw);

  if (
    ![makeId, modelId, genId].every(isId) ||
    (engineId !== undefined && !isId(engineId)) ||
    !Number.isInteger(year)
  ) {
    throw new Error("کلید خودرو نامعتبر است");
  }

  return engineId ? { makeId, modelId, genId, year, engineId } : { makeId, modelId, genId, year };
}

/**
 * Zod schema wrapping parseVehicleKey() for the `?vehicleKey=`/`?vehicle=`
 * query params apps/api validates every route through (§9). Shared here
 * rather than redefined per-module (modules/fitment, modules/catalog) so
 * every consumer reports the exact same 400 shape on a malformed key.
 */
export const vehicleKeySchema = z.string().transform((value, ctx) => {
  try {
    return parseVehicleKey(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "کلید خودرو نامعتبر است" });
    return z.NEVER;
  }
});
