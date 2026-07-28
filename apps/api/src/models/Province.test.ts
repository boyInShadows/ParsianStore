import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { ProvinceModel } from "./Province.js";

const TEST_URI = testDbUri("parsian-store-test-province");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await ProvinceModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("ProvinceModel", () => {
  it("stores a localized name and enforces a unique slug", async () => {
    const province = await ProvinceModel.create({
      name: { fa: "تهران", en: "Tehran" },
      slug: "tehran",
    });
    expect(province.name.fa).toBe("تهران");

    await expect(
      ProvinceModel.create({
        name: { fa: "x", en: "x" },
        slug: "tehran",
      }),
    ).rejects.toThrow();
  });
});
