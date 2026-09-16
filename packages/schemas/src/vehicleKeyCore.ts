// P15.S8b: split out of vehicleKey.ts so the browser's Garage widgets
// (stores/garage-store.ts, hooks/use-garage-url-sync.ts) can build/parse a
// `?v=` key without pulling zod into every shop route's chrome.
// `buildVehicleKey`/`parseVehicleKey` themselves never touched zod directly;
// the only zod-bound export in the old file was `vehicleKeySchema`, which no
// web import ever used, and `parseVehicleKey`'s own `isId()` helper, which
// did -- via `idSchema.safeParse()` from `./id.js`. That's what this file
// replaces with a hand-written UUID check (see `isUuid` below); everything
// else is unchanged from the original module.
//
// `vehicleKey.ts` re-exports everything from here and adds `vehicleKeySchema`
// on top, so apps/api (which imports the bare `"schemas"` barrel and does not
// care about browser bundle size) keeps working unchanged.

/** §3.4 "My Garage": the active vehicle is reflected in the URL as
 * `?v=<vehicleKey>` so results are shareable/crawlable, and §9's
 * `/fitment/check?productId&vehicleKey` needs the exact same encoding on
 * the API side -- one definition, shared, so apps/web and apps/api can
 * never drift on the format. */
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

/** Mirrors `packages/schemas/src/id.ts`'s `idSchema = z.string().uuid(...)`
 * exactly -- any RFC 4122 UUID version, not pinned to v7, on purpose (see
 * that file's own comment on why pinning the version nibble was a past
 * bug). `packages/schemas/src/id.test.ts` proves this against zod's own
 * `.uuid()` over a corpus that includes every version, the nil UUID,
 * uppercase, and malformed inputs -- keep the two in sync by construction,
 * not by re-reading this comment. */
// Copied verbatim from zod v3's own `uuidRegex` (node_modules/zod/v3/types.js)
// rather than a from-scratch pattern, precisely so there is nothing to drift.
// The `\b` word-boundary assertions are redundant against the literal `-`
// delimiters but kept for an exact match. `id.test.ts` still proves
// equivalence over a real corpus -- this comment is not the proof.
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;

/** Exported (only) so `id.test.ts` can prove it accepts/rejects exactly what
 * `packages/schemas/src/id.ts`'s zod-based `idSchema` does. Not otherwise a
 * public API of this module. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isId(value: string): boolean {
  return isUuid(value);
}

/** Encodes a Garage entry (§3.2's `{ makeId, modelId, genId, engineId?,
 * year }`) into the compact string carried in `?v=`. */
export function buildVehicleKey(parts: VehicleKeyParts): string {
  const segments = [parts.makeId, parts.modelId, parts.genId, String(parts.year)];
  if (parts.engineId) segments.push(parts.engineId);
  return segments.join(SEPARATOR);
}

/** Inverse of buildVehicleKey(). Throws a plain Error (not an API-specific
 * error type -- this module is shared with apps/web) on a malformed key;
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
