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

const SEPARATOR = ".";
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

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
    ![makeId, modelId, genId].every((id) => OBJECT_ID_RE.test(id)) ||
    (engineId !== undefined && !OBJECT_ID_RE.test(engineId)) ||
    !Number.isInteger(year)
  ) {
    throw new Error("کلید خودرو نامعتبر است");
  }

  return engineId ? { makeId, modelId, genId, year, engineId } : { makeId, modelId, genId, year };
}
