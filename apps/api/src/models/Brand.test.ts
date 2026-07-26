import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { BrandModel } from "./Brand.js";

const TEST_URI = testDbUri("parsian-store-test-brand");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await BrandModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
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
