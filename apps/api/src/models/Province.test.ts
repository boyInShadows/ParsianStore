import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { ProvinceModel } from "./Province.js";

beforeAll(async () => {
  await resetDb();
  await ProvinceModel.init();
});

afterAll(async () => {
  await disconnectDB();
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
