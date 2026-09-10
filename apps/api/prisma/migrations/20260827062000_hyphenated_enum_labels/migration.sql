-- AlterEnum
BEGIN;
CREATE TYPE "InventoryMoveReason_new" AS ENUM ('manual-adjustment', 'restock', 'reservation', 'reservation-released', 'reservation-confirmed');
ALTER TABLE "InventoryMove" ALTER COLUMN "reason" TYPE "InventoryMoveReason_new" USING ("reason"::text::"InventoryMoveReason_new");
ALTER TYPE "InventoryMoveReason" RENAME TO "InventoryMoveReason_old";
ALTER TYPE "InventoryMoveReason_new" RENAME TO "InventoryMoveReason";
DROP TYPE "public"."InventoryMoveReason_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SupplyRoute_new" AS ENUM ('oem', 'genuine-imported', 'domestic', 'grade1-aftermarket');
ALTER TABLE "Product" ALTER COLUMN "supplyRoute" TYPE "SupplyRoute_new" USING ("supplyRoute"::text::"SupplyRoute_new");
ALTER TYPE "SupplyRoute" RENAME TO "SupplyRoute_old";
ALTER TYPE "SupplyRoute_new" RENAME TO "SupplyRoute";
DROP TYPE "public"."SupplyRoute_old";
COMMIT;

