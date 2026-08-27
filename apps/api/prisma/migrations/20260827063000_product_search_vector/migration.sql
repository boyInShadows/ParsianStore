-- Full-text search over Product.searchText.
--
-- Hand-edited rather than taken verbatim from `prisma migrate diff`, which
-- emits a plain `ADD COLUMN "searchVector" tsvector`. A plain column would
-- have to be maintained by application code on every write -- the same
-- derive-on-save hook the Mongo version carried, and the same chance to
-- forget it on one path and silently ship an unsearchable product. A
-- GENERATED ALWAYS ... STORED column cannot drift: PostgreSQL recomputes it
-- from searchText on every insert and update, including ones that bypass the
-- application entirely.
--
-- 'simple' is deliberate. PostgreSQL ships no Persian text-search
-- configuration, and 'simple' does no stemming at all -- which is honest,
-- where applying English stemming rules to Persian would quietly mangle it.
-- Mongo's text index had the same limitation and the same reason.
ALTER TABLE "Product"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("searchText", ''))) STORED;

-- GIN, not GiST: the index is read far more often than written, and GIN's
-- larger build cost buys materially faster lookups for exactly that shape.
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
