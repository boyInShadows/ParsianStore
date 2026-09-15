/**
 * Hand-written runtime shape primitives -- the replacement for zod's
 * `safeParse` on the browser's own re-validation of `/auth/me`, `/cart`
 * and `/me/wishlist` responses (P15.S8b).
 *
 * ## Why this exists at all
 *
 * `AuthSession` and `CartSession` mount unconditionally in the (shop)
 * layout and `safeParse()` our own API's responses in the browser. That
 * pulled the whole zod runtime -- 14.0 kB gzipped -- into every shop
 * route's chrome (see `docs/fable-next-phase-brief.md` and `tasks.md`
 * P15.S8/S8b for the full attribution). The server keeps validating every
 * input with zod (CLAUDE.md SS11); this only replaces the browser
 * re-checking responses from an API it already trusts to run our own
 * server code.
 *
 * `apps/web/lib/fetchers/auth.ts`, `cart.ts` and `wishlist.ts` (plus the
 * shared `product-guard.ts`) are the only callers -- keeping the checks
 * here instead of importing anything from `packages/schemas` at the value
 * level is the whole mechanism, the same reasoning `lib/cx.ts` documents
 * for `tailwind-merge`: importing any binding from a zod-defining module
 * pulls the module, and the module pulls zod.
 */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

export function isLocalizedName(value: unknown): value is { fa: string; en: string } {
  return isPlainObject(value) && isString(value.fa) && isString(value.en);
}

/** Mirrors zod's `z.coerce.date()` -- accept a string/number, reject
 * anything that doesn't produce a valid `Date` (matches zod's own
 * `!isNaN(date.getTime())` check), and return the coerced instance rather
 * than the raw wire value so callers see the same type zod would have
 * handed them. */
export function toValidDate(value: unknown): Date | undefined {
  if (!(typeof value === "string" || typeof value === "number")) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
