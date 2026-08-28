-- Engine displacement is litres (1.3 for a Pride's 1.3L). It was translated
-- from Mongo as an integer, so every seeded engine stored 1 -- silently, since
-- the seed data is in litres, the wire schema accepts any number, and
-- PostgreSQL truncates rather than complaining. Read back from the live rows,
-- not assumed.

-- AlterTable
ALTER TABLE "VehicleEngine" ALTER COLUMN "displacement" SET DATA TYPE DOUBLE PRECISION;

-- (The Product.searchVector DROP DEFAULT that `migrate diff` emits alongside
-- this is omitted deliberately -- the generated-column false drift documented
-- in schema.prisma.)
