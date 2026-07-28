import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { VehicleEngineModel } from "../models/VehicleEngine.js";
import { VehicleGenModel } from "../models/VehicleGen.js";
import { VehicleMakeModel } from "../models/VehicleMake.js";
import { VehicleModelModel } from "../models/VehicleModel.js";
import { VEHICLE_SEED_DATA } from "./vehicles.data.js";
import { seedVehicles } from "./vehicles.js";

const TEST_URI = testDbUri("parsian-store-test-seed-vehicles");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function countExpected(): { makes: number; models: number; generations: number; engines: number } {
  let models = 0;
  let generations = 0;
  let engines = 0;
  for (const make of VEHICLE_SEED_DATA) {
    models += make.models.length;
    for (const model of make.models) {
      generations += model.generations.length;
      for (const gen of model.generations) {
        engines += gen.engines.length;
      }
    }
  }
  return { makes: VEHICLE_SEED_DATA.length, models, generations, engines };
}

describe("seedVehicles", () => {
  it("creates the full make/model/generation/engine tree", async () => {
    await seedVehicles();
    const expected = countExpected();

    await expect(VehicleMakeModel.countDocuments({})).resolves.toBe(expected.makes);
    await expect(VehicleModelModel.countDocuments({})).resolves.toBe(expected.models);
    await expect(VehicleGenModel.countDocuments({})).resolves.toBe(expected.generations);
    await expect(VehicleEngineModel.countDocuments({})).resolves.toBe(expected.engines);
  });

  it("is idempotent — running it again does not create duplicates", async () => {
    await seedVehicles();
    await seedVehicles();
    const expected = countExpected();

    await expect(VehicleMakeModel.countDocuments({})).resolves.toBe(expected.makes);
    await expect(VehicleModelModel.countDocuments({})).resolves.toBe(expected.models);
    await expect(VehicleGenModel.countDocuments({})).resolves.toBe(expected.generations);
    await expect(VehicleEngineModel.countDocuments({})).resolves.toBe(expected.engines);
  });

  it("seeds exactly Saipa and Iran Khodro — the ADR 0004 scope, nothing else", async () => {
    await seedVehicles();
    const makeSlugs = (await VehicleMakeModel.find({}).sort({ slug: 1 })).map((m) => m.slug);
    expect(makeSlugs).toEqual(["iran-khodro", "saipa"]);
  });

  it("links each model to its make and each generation to its model correctly", async () => {
    await seedVehicles();
    const saipa = await VehicleMakeModel.findOne({ slug: "saipa" });
    const tiba = await VehicleModelModel.findOne({ makeId: saipa!._id, slug: "tiba" });
    expect(tiba).not.toBeNull();

    const gens = await VehicleGenModel.find({ modelId: tiba!._id });
    expect(gens).toHaveLength(1);
    expect(gens[0]!.yearFrom).toBe(2009);

    const engines = await VehicleEngineModel.find({ genId: gens[0]!._id });
    expect(engines).toHaveLength(1);
    expect(engines[0]!.code).toBe("M15");
  });

  it("never sets both yearFrom and yearTo to the same nonsensical range", () => {
    for (const make of VEHICLE_SEED_DATA) {
      for (const model of make.models) {
        for (const gen of model.generations) {
          if (gen.yearTo !== null) {
            expect(gen.yearTo).toBeGreaterThan(gen.yearFrom);
          }
        }
      }
    }
  });
});
