import { normalizeFa } from "schemas";

/**
 * The haystack a product is found by: its two names, its SKU, and every OEM
 * and cross-reference number it carries, normalized through `normalizeFa` so
 * Arabic ye/kaf and Persian digits do not split a match.
 *
 * Still computed in the application rather than by the database, even though
 * `Product.searchVector` is a generated column now. The generated column
 * derives the *tsvector* from `searchText`; `searchText` itself is derived from
 * five fields and one Persian-normalization function, which is application
 * knowledge, not something to reimplement in PL/pgSQL.
 *
 * It used to live on the Mongoose model behind a `pre("save")` hook, which is
 * exactly how it once silently broke: the seed wrote products with
 * `findOneAndUpdate`, that is query middleware, document middleware never
 * fired, and every seeded product shipped with an empty `searchText` -- search
 * against the seeded catalog simply did not work. A plain function that every
 * write path calls explicitly cannot fail that way, because forgetting it is
 * now visible at the call site.
 */
export function computeProductSearchText(fields: {
  nameFa: string;
  nameEn: string;
  sku: string;
  oemNumbers: string[];
  crossRefNumbers: string[];
}): string {
  const parts = [
    fields.nameFa,
    fields.nameEn,
    fields.sku,
    ...fields.oemNumbers,
    ...fields.crossRefNumbers,
  ];
  return normalizeFa(parts.join(" "));
}
