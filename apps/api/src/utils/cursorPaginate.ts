import { ApiError } from "./ApiError.js";
import type { OrderBy, Where } from "./pagination.js";

// §9's Product listing API needs "cursor-safe pagination" specifically
// (unlike every other list endpoint's page/limit, see utils/pagination.ts)
// because a catalog mutates constantly (stock/price/new arrivals) — with
// skip/limit, an item inserted ahead of the current page shifts every
// later page by one, duplicating or skipping rows for a shopper mid-scroll.
// Keyset pagination sidesteps that: each page's cursor names the exact
// last row seen (sort field value + id tiebreaker for stable ordering
// when the sort field repeats), so a later page is always "everything
// after that row," regardless of what changed before it.
export type CursorValueType = "date" | "number";

interface CursorPayload {
  v: string | number;
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "v" in parsed &&
      "id" in parsed &&
      (typeof (parsed as CursorPayload).v === "string" ||
        typeof (parsed as CursorPayload).v === "number") &&
      typeof (parsed as CursorPayload).id === "string"
    ) {
      return parsed as CursorPayload;
    }
    throw new Error("shape mismatch");
  } catch {
    throw new ApiError(400, "نشانگر صفحه‌بندی نامعتبر است");
  }
}

export interface CursorPageMeta {
  nextCursor: string | null;
  limit: number;
}

export interface CursorPageResult<T> {
  data: T[];
  meta: CursorPageMeta;
}

export interface CursorPaginateOptions {
  sortField: string;
  valueType: CursorValueType;
  direction: 1 | -1;
  cursor: string | undefined;
  limit: number;
  /** Relations the caller's DTO needs joined in. */
  include?: Record<string, unknown>;
}

export interface CursorPaginatableDelegate<TRow> {
  findMany(args: {
    where?: Where;
    orderBy?: OrderBy[];
    take?: number;
    include?: Record<string, unknown>;
  }): Promise<TRow[]>;
}

/**
 * Fetches one page via keyset pagination on `(sortField, id)`. Always
 * over-fetches by one row to know whether a next page exists without a
 * separate count query — cursor pagination has no stable "total," by
 * design (see the module comment above). `valueType` round-trips a Date
 * sort field through the cursor correctly: JSON serializes a Date as an
 * ISO string, so the decoded value must be parsed back into a real Date
 * before it is compared against a timestamp column again.
 *
 * Prisma has a first-class `cursor`/`skip: 1` option, deliberately not used
 * here. It keys on a unique field only, so it cannot express "after this
 * price, or the same price and a later id" — which is the whole point of the
 * tiebreaker. The explicit OR below is the same predicate the Mongo version
 * built, and it survives a sort field with duplicate values.
 */
export async function cursorPaginate<TRow extends { id: string }>(
  delegate: CursorPaginatableDelegate<TRow>,
  where: Where,
  { sortField, valueType, direction, cursor, limit, include }: CursorPaginateOptions,
): Promise<CursorPageResult<TRow>> {
  const ascending = direction === 1;
  const order: "asc" | "desc" = ascending ? "asc" : "desc";
  const cursorWhere: Where = { ...where };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    const value = valueType === "date" ? new Date(decoded.v) : decoded.v;
    const cmp = ascending ? "gt" : "lt";
    cursorWhere.OR = [
      { [sortField]: { [cmp]: value } },
      { [sortField]: value, id: { [cmp]: decoded.id } },
    ];
  }

  const rows = await delegate.findMany({
    where: cursorWhere,
    orderBy: [{ [sortField]: order }, { id: order }],
    take: limit + 1,
    ...(include ? { include } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  let nextCursor: string | null = null;
  if (hasMore && last) {
    const rawValue = (last as unknown as Record<string, string | number | Date>)[sortField]!;
    const v = valueType === "date" ? (rawValue as Date).toISOString() : (rawValue as number);
    nextCursor = encodeCursor({ v, id: last.id });
  }

  return { data: page, meta: { nextCursor, limit } };
}
