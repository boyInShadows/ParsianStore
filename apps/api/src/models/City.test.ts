import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { CityModel } from "./City.js";

const TEST_URI = testDbUri("parsian-store-test-city");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await CityModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("CityModel", () => {
  it("requires a provinceId and enforces a unique slug per province", async () => {
    const provinceId = new mongoose.Types.ObjectId();
    const city = await CityModel.create({
      provinceId,
      name: { fa: "کرج", en: "Karaj" },
      slug: "karaj",
    });
    expect(city.name.fa).toBe("کرج");

    await expect(
      CityModel.create({
        provinceId,
        name: { fa: "x", en: "x" },
        slug: "karaj",
      }),
    ).rejects.toThrow();
  });

  it("allows the same slug to be reused across two different provinces", async () => {
    const provinceA = new mongoose.Types.ObjectId();
    const provinceB = new mongoose.Types.ObjectId();

    await CityModel.create({
      provinceId: provinceA,
      name: { fa: "مرکز الف", en: "Center A" },
      slug: "center",
    });

    await expect(
      CityModel.create({
        provinceId: provinceB,
        name: { fa: "مرکز ب", en: "Center B" },
        slug: "center",
      }),
    ).resolves.toBeDefined();
  });
});
