import type { FilterQuery, HydratedDocument, Model } from "mongoose";
import { ApiError } from "./ApiError.js";

// §9's Product listing API needs "cursor-safe pagination" specifically
// (unlike every other list endpoint's page/limit, see utils/pagination.ts)
// because a catalog mutates constantly (stock/price/new arrivals) — with
// skip/limit, an item inserted ahead of the current page shifts every
// later page by one, duplicating or skipping rows for a shopper mid-scroll.
// Keyset pagination sidesteps that: each page's cursor names the exact
// last row seen (sort field value + _id tiebreaker for stable ordering
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
  // P6.S1: e.g. "+wholesalePriceRial" to opt into a `select: false` field
  // for this query only — an internal server concern, not part of the
  // client-facing cursor contract above.
  select?: string;
}

/**
 * Fetches one page via keyset pagination on `(sortField, _id)`. Always
 * over-fetches by one row to know whether a next page exists without a
 * separate count query — cursor pagination has no stable "total," by
 * design (see the module comment above). `valueType` round-trips a Date
 * sort field through the cursor correctly: JSON serializes a Date as an
 * ISO string, so the decoded value must be parsed back into a real Date
 * before it's compared against a Date-typed field again.
 */
export async function cursorPaginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  { sortField, valueType, direction, cursor, limit, select }: CursorPaginateOptions,
): Promise<CursorPageResult<HydratedDocument<T>>> {
  // Built as a plain untyped object rather than FilterQuery<T> directly:
  // `sortField` is a runtime string, not a `keyof T` literal, so its use
  // as a computed key can't type-check structurally against T. Cast once,
  // at the query call site below, instead of fighting Mongoose's types
  // for every dynamic-key assignment in between.
  const cursorFilter: Record<string, unknown> = { ...filter };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    const value = valueType === "date" ? new Date(decoded.v) : decoded.v;
    const cmp = direction === 1 ? "$gt" : "$lt";
    cursorFilter.$or = [
      { [sortField]: { [cmp]: value } },
      { [sortField]: value, _id: { [cmp]: decoded.id } },
    ];
  }

  const docs = await model
    .find(cursorFilter as FilterQuery<T>)
    // "" is a real Mongoose no-op select, same as omitting .select()
    // entirely -- avoids the `string | undefined` overload TS otherwise
    // rejects here for an absent `select`.
    .select(select ?? "")
    .sort({ [sortField]: direction, _id: direction })
    .limit(limit + 1);

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const last = page[page.length - 1];
  let nextCursor: string | null = null;
  if (hasMore && last) {
    const rawValue = (last as unknown as Record<string, string | number | Date>)[sortField]!;
    const v = valueType === "date" ? (rawValue as Date).toISOString() : (rawValue as number);
    nextCursor = encodeCursor({ v, id: String(last._id) });
  }

  return { data: page, meta: { nextCursor, limit } };
}
