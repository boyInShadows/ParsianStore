import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { BrandModel } from "./Brand.js";

beforeAll(async () => {
  await resetDb();
  await BrandModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("BrandModel", () => {
  it("stores a localized name, defaults isOEM to false, and enforces a unique slug", async () => {
    const brand = await BrandModel.create({
      name: { fa: "بوش", en: "Bosch" },
      slug: "bosch",
      country: "Germany",
    });
    expect(brand.name.fa).toBe("بوش");
    expect(brand.isOEM).toBe(false);

    await expect(
      BrandModel.create({
        name: { fa: "x", en: "x" },
        slug: "bosch",
        country: "Germany",
      }),
    ).rejects.toThrow();
  });

  it("requires country", async () => {
    await expect(
      BrandModel.create({
        name: { fa: "x", en: "x" },
        slug: "no-country",
      }),
    ).rejects.toThrow();
  });
});
