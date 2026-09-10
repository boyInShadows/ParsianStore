import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, prisma, resetDb } from "../config/testDb.js";
import { VEHICLE_SEED_DATA } from "./vehicles.data.js";
import { seedVehicles } from "./vehicles.js";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
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

async function counts(): Promise<{
  makes: number;
  models: number;
  generations: number;
  engines: number;
}> {
  const [makes, models, generations, engines] = await Promise.all([
    prisma.vehicleMake.count(),
    prisma.vehicleModel.count(),
    prisma.vehicleGen.count(),
    prisma.vehicleEngine.count(),
  ]);
  return { makes, models, generations, engines };
}

describe("seedVehicles", () => {
  it("creates the full make/model/generation/engine tree", async () => {
    await seedVehicles();
    await expect(counts()).resolves.toEqual(countExpected());
  });

  it("is idempotent — running it again does not create duplicates", async () => {
    await seedVehicles();
    await seedVehicles();
    await expect(counts()).resolves.toEqual(countExpected());
  });

  it("seeds exactly Saipa and Iran Khodro — the ADR 0004 scope, nothing else", async () => {
    await seedVehicles();
    const makes = await prisma.vehicleMake.findMany({ orderBy: { slug: "asc" } });
    expect(makes.map((m) => m.slug)).toEqual(["iran-khodro", "saipa"]);
  });

  it("links each model to its make and each generation to its model correctly", async () => {
    await seedVehicles();
    const saipa = await prisma.vehicleMake.findUnique({ where: { slug: "saipa" } });
    const tiba = await prisma.vehicleModel.findUnique({
      where: { makeId_slug: { makeId: saipa!.id, slug: "tiba" } },
    });
    expect(tiba).not.toBeNull();

    const gens = await prisma.vehicleGen.findMany({ where: { modelId: tiba!.id } });
    expect(gens).toHaveLength(1);
    expect(gens[0]!.yearFrom).toBe(2009);

    const engines = await prisma.vehicleEngine.findMany({ where: { genId: gens[0]!.id } });
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
