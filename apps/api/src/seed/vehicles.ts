import { pathToFileURL } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { VehicleEngineModel } from "../models/VehicleEngine.js";
import { VehicleGenModel } from "../models/VehicleGen.js";
import { VehicleMakeModel } from "../models/VehicleMake.js";
import { VehicleModelModel } from "../models/VehicleModel.js";
import { VEHICLE_SEED_DATA } from "./vehicles.data.js";

/**
 * Idempotent (upsert on the natural key at each level: make/model slug,
 * generation name+yearFrom, engine code) — safe to re-run on every
 * deploy as the data set grows, without duplicating existing rows.
 */
export async function seedVehicles(): Promise<void> {
  let makes = 0;
  let models = 0;
  let generations = 0;
  let engines = 0;

  for (const makeSeed of VEHICLE_SEED_DATA) {
    const make = await VehicleMakeModel.findOneAndUpdate(
      { slug: makeSeed.slug },
      {
        name: makeSeed.name,
        slug: makeSeed.slug,
        country: makeSeed.country,
        isDomestic: makeSeed.isDomestic,
      },
      { upsert: true, new: true },
    );
    makes += 1;

    for (const modelSeed of makeSeed.models) {
      const vehicleModel = await VehicleModelModel.findOneAndUpdate(
        { makeId: make._id, slug: modelSeed.slug },
        {
          makeId: make._id,
          name: modelSeed.name,
          slug: modelSeed.slug,
          bodyType: modelSeed.bodyType,
        },
        { upsert: true, new: true },
      );
      models += 1;

      for (const genSeed of modelSeed.generations) {
        const gen = await VehicleGenModel.findOneAndUpdate(
          { modelId: vehicleModel._id, yearFrom: genSeed.yearFrom },
          {
            modelId: vehicleModel._id,
            name: genSeed.name,
            yearFrom: genSeed.yearFrom,
            yearTo: genSeed.yearTo,
            facelift: genSeed.facelift,
          },
          { upsert: true, new: true },
        );
        generations += 1;

        for (const engineSeed of genSeed.engines) {
          await VehicleEngineModel.findOneAndUpdate(
            { genId: gen._id, code: engineSeed.code },
            {
              genId: gen._id,
              code: engineSeed.code,
              displacement: engineSeed.displacement,
              fuel: engineSeed.fuel,
              power: engineSeed.power,
            },
            { upsert: true, new: true },
          );
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
