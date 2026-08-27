import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { CityModel } from "./City.js";

beforeAll(async () => {
  await resetDb();
  await CityModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("CityModel", () => {
  it("requires a provinceId and enforces a unique slug per province", async () => {
    const provinceId = randomUUID();
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
    const provinceA = randomUUID();
    const provinceB = randomUUID();

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
