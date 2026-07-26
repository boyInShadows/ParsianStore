import { pathToFileURL } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { CityModel } from "../models/City.js";
import { ProvinceModel } from "../models/Province.js";
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
    const province = await ProvinceModel.findOneAndUpdate(
      { slug: provinceSeed.slug },
      { name: provinceSeed.name, slug: provinceSeed.slug },
      { upsert: true, new: true },
    );
    provinces += 1;

    for (const citySeed of provinceSeed.cities) {
      await CityModel.findOneAndUpdate(
        { provinceId: province._id, slug: citySeed.slug },
        { provinceId: province._id, name: citySeed.name, slug: citySeed.slug },
        { upsert: true, new: true },
      );
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
