import type { CatalogSystemCode, InventoryMoveReason, SupplyRoute } from "@prisma/client";
import type { LocalizedName } from "schemas";

/**
 * Rebuilds the `{ fa, en }` object the API has always emitted from the two
 * columns Postgres stores it in.
 *
 * `schema.prisma` splits every localized name into `nameFa`/`nameEn` because a
 * Json blob cannot be indexed, constrained or sorted on. That is a *storage*
 * decision, and it deliberately stops at the storage layer: the wire contract
 * stays `name: { fa, en }`, which is what `packages/schemas` validates and what
 * every existing apps/web consumer reads. Changing both at once would have made
 * a database migration into a breaking API change for no benefit.
 */
export function localized(row: { nameFa: string; nameEn: string }): LocalizedName {
  return { fa: row.nameFa, en: row.nameEn };
}

/** The inverse, for write paths that accept the `{ fa, en }` shape. */
export function toColumns(name: LocalizedName): { nameFa: string; nameEn: string } {
  return { nameFa: name.fa, nameEn: name.en };
}

/**
 * Drops `undefined` keys so they are not handed to Prisma as explicit nulls.
 *
 * Prisma treats `{ field: undefined }` as "do not touch" already, but building
 * update payloads by spreading optional inputs makes it easy to produce
 * `{ field: undefined }` where the caller *meant* "leave alone" and equally
 * easy to produce it where they meant "clear it". Being explicit here keeps
 * the two apart at the one place it matters.
 */
export function definedOnly<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * The `seo: { title?, description? }` object, rebuilt from its two columns.
 *
 * Same reasoning as `localized()`: two nullable columns store better than a
 * Json blob, and the wire shape should not move because the storage did. A
 * null column is left out rather than sent as an empty string, so a consumer
 * never has to treat "" and absent as the same thing.
 */
export function seo(row: { seoTitle: string | null; seoDescription: string | null }): {
  title?: string;
  description?: string;
} {
  return {
    ...(row.seoTitle ? { title: row.seoTitle } : {}),
    ...(row.seoDescription ? { description: row.seoDescription } : {}),
  };
}

/** The inverse, for write paths that accept the `{ title?, description? }` shape. */
export function seoColumns(input: { title?: string; description?: string } | undefined): {
  seoTitle?: string | null;
  seoDescription?: string | null;
} {
  if (!input) return {};
  return { seoTitle: input.title ?? null, seoDescription: input.description ?? null };
}

/** `null` from a column, `undefined` in an optional DTO field. */
export function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * The two spellings of an enum value, bridged in one place.
 *
 * Several of this project's enum values are hyphenated on the wire --
 * "SYS-01", "genuine-imported", "manual-adjustment" -- and a Prisma enum
 * member cannot contain a hyphen. Each of those members is `@map`ped in
 * `schema.prisma` so the PostgreSQL labels stay exactly the wire values;
 * only the generated TypeScript identifier differs, substituting an
 * underscore. These two functions are the entire bridge.
 *
 * This is worth understanding rather than pattern-matching past, because the
 * failure it prevents is silent: without the map the database stores one
 * spelling while every route, schema and admin screen speaks the other, and
 * nothing -- no type error, no constraint -- ever says so.
 *
 * A character swap rather than a lookup table per enum: the mapping is
 * mechanical and total, and three hand-written tables are three things that
 * can drift from the schema.
 */
function toWire(value: string): string {
  return value.replaceAll("_", "-");
}

function fromWire(value: string): string {
  return value.replaceAll("-", "_");
}

export function systemCodeToWire(code: CatalogSystemCode | string): string {
  return toWire(code);
}

/**
 * The casts below are the only ones in this direction, and they belong here
 * rather than at each call site: the input has already been validated against
 * the shared const-array by the route's Zod schema, so the one thing the
 * compiler is missing is that swapping the hyphen yields a member of the
 * generated enum.
 */
export function systemCodeFromWire(code: string): CatalogSystemCode {
  return fromWire(code) as CatalogSystemCode;
}

export function supplyRouteToWire(route: SupplyRoute | string): string {
  return toWire(route);
}

export function supplyRouteFromWire(route: string): SupplyRoute {
  return fromWire(route) as SupplyRoute;
}

export function moveReasonToWire(reason: InventoryMoveReason | string): string {
  return toWire(reason);
}

export function moveReasonFromWire(reason: string): InventoryMoveReason {
  return fromWire(reason) as InventoryMoveReason;
}
