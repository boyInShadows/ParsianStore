import { Prisma } from "@prisma/client";
import { z } from "zod";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// §9: "Every list endpoint paginated (?page&limit&sort), limit capped at
// 100." Clamped rather than rejected — a client asking for limit=500
// gets 100 back, not a 400; still Zod-validated shape/type per the same
// section's blanket validate() rule.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(DEFAULT_LIMIT),
  sort: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export function clampLimit(limit: number): number {
  return Math.min(limit, MAX_LIMIT);
}

export function toSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Every model name in `schema.prisma`, so a typo is a compile error. */
export type ModelName = Prisma.ModelName;

export type Where = Record<string, unknown>;
export type OrderBy = Record<string, "asc" | "desc">;

/**
 * The scalar columns of each model, from Prisma's own runtime metadata.
 *
 * This exists because of a genuine behaviour difference the migration
 * introduces: Mongoose silently ignored a `?sort=` naming a path the schema
 * did not have, while Prisma **throws** on an unknown `orderBy` key. Passing
 * client input straight through would therefore turn `?sort=whatever` from a
 * harmless no-op into a 500. Sort fields are checked against this map and
 * unknown ones dropped, preserving the old leniency without hand-maintaining
 * a whitelist per endpoint.
 */
const SCALAR_FIELDS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [
    model.name,
    new Set(model.fields.filter((field) => field.kind === "scalar").map((field) => field.name)),
  ]),
);

/**
 * Translates a Mongoose-style sort string into Prisma's `orderBy`.
 *
 * The wire format is deliberately unchanged -- `"-createdAt"`, `"slug"`,
 * `"methodCode zone minWeightGram"` -- because it is part of the public `?sort=`
 * query contract that both the admin panel and any API consumer already use.
 * Only the translation is new.
 *
 * Always appends `id` as the final tiebreaker. Without it a page boundary that
 * falls inside a run of equal sort values is not deterministic: Postgres is
 * free to return those rows in any order, so the same row can appear on two
 * consecutive pages, or on neither. Mongo had the same hazard; nothing forced
 * the issue there because `_id` happened to correlate with insertion order.
 */
export function parseSort(sort: string | undefined, model: ModelName): OrderBy[] {
  const fields = SCALAR_FIELDS.get(model) ?? new Set<string>();
  const orderBy: OrderBy[] = [];
  for (const token of (sort ?? "").split(/[\s,]+/).filter(Boolean)) {
    const descending = token.startsWith("-");
    const field = descending ? token.slice(1) : token;
    if (!fields.has(field) || field === "id") continue;
    orderBy.push({ [field]: descending ? "desc" : "asc" });
  }
  orderBy.push({ id: "asc" });
  return orderBy;
}

/**
 * The minimum a Prisma model delegate has to offer to be paginated. Declared
 * structurally rather than as a union of the 32 generated delegate types: this
 * is the whole surface `paginate` touches, and naming it keeps the helper
 * usable from any module without importing that module's row type here.
 */
export interface PaginatableDelegate<TRow> {
  findMany(args: {
    where?: Where;
    orderBy?: OrderBy[];
    skip?: number;
    take?: number;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TRow[]>;
  count(args: { where?: Where }): Promise<number>;
}

export interface PaginateOptions {
  /** Prisma `select`. Mutually exclusive with `include`, as in Prisma itself. */
  select?: Record<string, unknown>;
  /** Prisma `include`, for the relations a DTO needs joined in. */
  include?: Record<string, unknown>;
}

/**
 * The shared shape behind every §9 list endpoint: filter, count and page a
 * table the same way every time, so each list function stays a one-liner
 * instead of repeating skip/take/count.
 *
 * `model` is passed alongside the delegate because a Prisma delegate does not
 * know its own model name at runtime, and `parseSort` needs it to tell a real
 * column from client-supplied noise.
 *
 * The soft-delete filter is *not* applied here -- the client extension in
 * `config/prisma.ts` does it for every query in the app, including these two.
 */
export async function paginate<TRow>(
  delegate: PaginatableDelegate<TRow>,
  model: ModelName,
  where: Where,
  { page, limit, sort }: PaginationQuery,
  options?: PaginateOptions,
): Promise<PaginatedResult<TRow>> {
  const effectiveLimit = clampLimit(limit);
  const [data, total] = await Promise.all([
    delegate.findMany({
      where,
      orderBy: parseSort(sort, model),
      skip: toSkip(page, effectiveLimit),
      take: effectiveLimit,
      ...(options?.select ? { select: options.select } : {}),
      ...(options?.include ? { include: options.include } : {}),
    }),
    delegate.count({ where }),
  ]);
  return { data, meta: { total, page, limit: effectiveLimit } };
}
