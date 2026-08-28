-- A soft-deletable row cannot carry a plain unique key: the tombstone keeps
-- owning it, so deleting the "0-1000g" band made that band uncreatable
-- forever. "Unique among live rows" is a partial index Prisma cannot declare,
-- and a hand-written one would be fought by every future `migrate diff`.
-- `assertNoOverlap` in shipping.admin.service.ts already enforces something
-- stricter: no overlapping band at all, not merely no band starting at the
-- same gram. See the note on ShippingRate in schema.prisma.

-- DropIndex
DROP INDEX "ShippingRate_methodCode_zone_minWeightGram_key";

-- CreateIndex
CREATE INDEX "ShippingRate_methodCode_zone_idx" ON "ShippingRate"("methodCode", "zone");

-- (The `ALTER TABLE "Product" ALTER COLUMN "searchVector" DROP DEFAULT` that
-- `migrate diff` emits alongside this is omitted on purpose -- it is the
-- generated-column false drift documented in schema.prisma.)
