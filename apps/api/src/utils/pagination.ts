import type { FilterQuery, HydratedDocument, Model } from "mongoose";
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

/**
 * The shared shape behind every §9 list endpoint: filter, count, and page
 * a Mongoose collection the same way every time, so each vehicles.*-style
 * list function is a one-liner instead of repeating skip/limit/count.
 *
 * `select` is a separate optional 4th param, not folded into
 * `PaginationQuery` -- that type is the Zod-validated shape of the client's
 * own query string, `select` is an internal server-side concern (P6.S1
 * needs `+wholesalePriceRial` on some call sites, none of the client's
 * business).
 */
export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  { page, limit, sort }: PaginationQuery,
  options?: { select?: string },
): Promise<PaginatedResult<HydratedDocument<T>>> {
  const effectiveLimit = clampLimit(limit);
  const [data, total] = await Promise.all([
    model
      .find(filter)
      // "" is a real Mongoose no-op select, same as omitting .select()
      // entirely -- avoids the `string | undefined` overload TS otherwise
      // rejects here for an absent `select`.
      .select(options?.select ?? "")
      .sort(sort)
      .skip(toSkip(page, effectiveLimit))
      .limit(effectiveLimit),
    model.countDocuments(filter),
  ]);
  return { data, meta: { total, page, limit: effectiveLimit } };
}
