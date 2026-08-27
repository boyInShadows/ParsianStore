import type { CatalogSystemCode } from "@prisma/client";
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
 * The two spellings of a catalog system code, bridged in one place.
 *
 * The wire value is hyphenated (`"SYS-01"`) and always has been -- it is what
 * `packages/schemas` validates and what the admin panel and storefront both
 * send. A Prisma enum member cannot contain a hyphen, so the generated
 * TypeScript identifier is `SYS_01` while the PostgreSQL label is `@map`ped
 * back to `"SYS-01"`. Only the identifier differs, and only here.
 *
 * A plain character swap rather than a lookup table: the shape is fixed at
 * `SYS_NN`, so a table would be ten lines that can drift from the enum.
 */
export function systemCodeToWire(code: CatalogSystemCode | string): string {
  return code.replace("_", "-");
}

/**
 * The one cast in this direction, and it belongs here rather than at each call
 * site: the input has already been validated against `CATALOG_SYSTEM_CODES` by
 * the route's Zod schema, so the only thing the compiler is missing is that
 * swapping the hyphen yields a member of the generated enum. Doing it here
 * means the callers stay honest and there is exactly one place to look if the
 * enum ever gains a member that does not fit the `SYS_NN` shape.
 */
export function systemCodeFromWire(code: string): CatalogSystemCode {
  return code.replace("-", "_") as CatalogSystemCode;
}
