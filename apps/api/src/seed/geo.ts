import { pathToFileURL } from "node:url";
import { logger } from "../config/logger.js";
import { connectDB, disconnectDB, prisma } from "../config/prisma.js";
import { toColumns } from "../utils/serialize.js";
import { GEO_SEED_DATA } from "./geo.data.js";

/**
 * Idempotent (upsert on the natural key at each level: province slug,
 * city provinceId+slug) — safe to re-run on every deploy as the data set
 * grows, without duplicating existing rows.
 */
export async function seedGeo(): Promise<void> {
  let provinces = 0;
  let cities = 0;

  for (const provinceSeed of GEO_SEED_DATA) {
    const province = await prisma.province.upsert({
      where: { slug: provinceSeed.slug },
      update: toColumns(provinceSeed.name),
      create: { ...toColumns(provinceSeed.name), slug: provinceSeed.slug },
    });
    provinces += 1;

    for (const citySeed of provinceSeed.cities) {
      await prisma.city.upsert({
        // The compound unique `@@unique([provinceId, slug])`; Prisma exposes it
        // under the joined field name, not as two loose keys.
        where: { provinceId_slug: { provinceId: province.id, slug: citySeed.slug } },
        update: toColumns(citySeed.name),
        create: { ...toColumns(citySeed.name), slug: citySeed.slug, provinceId: province.id },
      });
      cities += 1;
    }
  }

  logger.info({ provinces, cities }, "Geo seed complete");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  connectDB()
    .then(() => seedGeo())
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "Geo seed failed");
      process.exit(1);
    });
}
