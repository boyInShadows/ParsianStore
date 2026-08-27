-- AlterEnum
BEGIN;
CREATE TYPE "CatalogSystemCode_new" AS ENUM ('SYS-01', 'SYS-02', 'SYS-03', 'SYS-04', 'SYS-05', 'SYS-06', 'SYS-07', 'SYS-08', 'SYS-09', 'SYS-10');
ALTER TABLE "Category" ALTER COLUMN "systemCode" TYPE "CatalogSystemCode_new" USING ("systemCode"::text::"CatalogSystemCode_new");
ALTER TYPE "CatalogSystemCode" RENAME TO "CatalogSystemCode_old";
ALTER TYPE "CatalogSystemCode_new" RENAME TO "CatalogSystemCode";
DROP TYPE "public"."CatalogSystemCode_old";
COMMIT;

