import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { CityModel } from "../models/City.js";
import { ProvinceModel } from "../models/Province.js";
import { GEO_SEED_DATA } from "./geo.data.js";
import { seedGeo } from "./geo.js";

const TEST_URI = testDbUri("parsian-store-test-seed-geo");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function countExpectedCities(): number {
  return GEO_SEED_DATA.reduce((sum, province) => sum + province.cities.length, 0);
}

describe("seedGeo", () => {
  it("creates all 31 provinces and every seeded city", async () => {
    await seedGeo();

    await expect(ProvinceModel.countDocuments({})).resolves.toBe(31);
    expect(GEO_SEED_DATA).toHaveLength(31);
    await expect(CityModel.countDocuments({})).resolves.toBe(countExpectedCities());
  });

  it("is idempotent — running it again does not create duplicates", async () => {
    await seedGeo();
    await seedGeo();

    await expect(ProvinceModel.countDocuments({})).resolves.toBe(31);
    await expect(CityModel.countDocuments({})).resolves.toBe(countExpectedCities());
  });

  it("links every city to its own province", async () => {
    await seedGeo();
    const tehran = await ProvinceModel.findOne({ slug: "tehran" });
    const cities = await CityModel.find({ provinceId: tehran!._id });
    expect(cities.map((c) => c.slug).sort()).toEqual(
      ["damavand", "eslamshahr", "pakdasht", "rey", "tehran", "varamin"].sort(),
    );
  });
});
