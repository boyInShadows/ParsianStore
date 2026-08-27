import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, prisma, resetDb } from "../config/testDb.js";
import { GEO_SEED_DATA } from "./geo.data.js";
import { seedGeo } from "./geo.js";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

function countExpectedCities(): number {
  return GEO_SEED_DATA.reduce((sum, province) => sum + province.cities.length, 0);
}

describe("seedGeo", () => {
  it("creates all 31 provinces and every seeded city", async () => {
    await seedGeo();

    await expect(prisma.province.count()).resolves.toBe(31);
    expect(GEO_SEED_DATA).toHaveLength(31);
    await expect(prisma.city.count()).resolves.toBe(countExpectedCities());
  });

  it("is idempotent — running it again does not create duplicates", async () => {
    await seedGeo();
    await seedGeo();

    await expect(prisma.province.count()).resolves.toBe(31);
    await expect(prisma.city.count()).resolves.toBe(countExpectedCities());
  });

  it("links every city to its own province", async () => {
    await seedGeo();
    const tehran = await prisma.province.findUnique({ where: { slug: "tehran" } });
    const cities = await prisma.city.findMany({ where: { provinceId: tehran!.id } });
    expect(cities.map((c) => c.slug).sort()).toEqual(
      ["damavand", "eslamshahr", "pakdasht", "rey", "tehran", "varamin"].sort(),
    );
  });
});
