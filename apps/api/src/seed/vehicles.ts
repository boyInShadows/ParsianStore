import { pathToFileURL } from "node:url";
import { logger } from "../config/logger.js";
import { connectDB, disconnectDB, prisma } from "../config/prisma.js";
import { toColumns } from "../utils/serialize.js";
import { VEHICLE_SEED_DATA } from "./vehicles.data.js";

/**
 * Idempotent (upsert on the natural key at each level: make/model slug,
 * generation modelId+yearFrom, engine genId+code) — safe to re-run on every
 * deploy as the data set grows, without duplicating existing rows.
 *
 * Each of those natural keys is now a real `@@unique` in `schema.prisma`.
 * Under Mongoose they existed only as the filter half of a `findOneAndUpdate`,
 * so nothing stopped a second writer creating the duplicate the seed was
 * carefully avoiding.
 */
export async function seedVehicles(): Promise<void> {
  let makes = 0;
  let models = 0;
  let generations = 0;
  let engines = 0;

  for (const makeSeed of VEHICLE_SEED_DATA) {
    const makeFields = {
      ...toColumns(makeSeed.name),
      country: makeSeed.country,
      isDomestic: makeSeed.isDomestic,
    };
    const make = await prisma.vehicleMake.upsert({
      where: { slug: makeSeed.slug },
      update: makeFields,
      create: { ...makeFields, slug: makeSeed.slug },
    });
    makes += 1;

    for (const modelSeed of makeSeed.models) {
      const modelFields = { ...toColumns(modelSeed.name), bodyType: modelSeed.bodyType };
      const vehicleModel = await prisma.vehicleModel.upsert({
        where: { makeId_slug: { makeId: make.id, slug: modelSeed.slug } },
        update: modelFields,
        create: { ...modelFields, slug: modelSeed.slug, makeId: make.id },
      });
      models += 1;

      for (const genSeed of modelSeed.generations) {
        const genFields = {
          ...toColumns(genSeed.name),
          yearTo: genSeed.yearTo,
          facelift: genSeed.facelift,
        };
        const gen = await prisma.vehicleGen.upsert({
          where: { modelId_yearFrom: { modelId: vehicleModel.id, yearFrom: genSeed.yearFrom } },
          update: genFields,
          create: { ...genFields, yearFrom: genSeed.yearFrom, modelId: vehicleModel.id },
        });
        generations += 1;

        for (const engineSeed of genSeed.engines) {
          const engineFields = {
            displacement: engineSeed.displacement,
            fuel: engineSeed.fuel,
            power: engineSeed.power,
          };
          await prisma.vehicleEngine.upsert({
            where: { genId_code: { genId: gen.id, code: engineSeed.code } },
            update: engineFields,
            create: { ...engineFields, code: engineSeed.code, genId: gen.id },
          });
          engines += 1;
        }
      }
    }
  }

  logger.info({ makes, models, generations, engines }, "Vehicle seed complete");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  connectDB()
    .then(() => seedVehicles())
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "Vehicle seed failed");
      process.exit(1);
    });
}
