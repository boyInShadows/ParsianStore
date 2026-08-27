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
