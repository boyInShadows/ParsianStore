-- One live cart per identity. Mongo enforced this with a sparse unique index
-- and `findOrCreateCart` has always relied on it; a nullable unique column is
-- the same guarantee here, since PostgreSQL does not consider two nulls equal.
-- The plain indexes are dropped because each unique brings its own.

-- DropIndex
DROP INDEX "Cart_anonId_idx";

-- DropIndex
DROP INDEX "Cart_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_anonId_key" ON "Cart"("anonId");

-- NOTE: `prisma migrate diff` also emitted
--   ALTER TABLE "Product" ALTER COLUMN "searchVector" DROP DEFAULT;
-- which is deliberately absent. It reads the generated column's expression as
-- a default and tries to drop it; PostgreSQL answers 42601, "column
-- searchVector of relation Product is a generated column". Every future
-- migration will carry that line and every one of them has to have it removed
-- -- see the note on Product.searchVector in schema.prisma.
