import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { VehicleMakeModel } from "./VehicleMake.js";

beforeAll(async () => {
  await resetDb();
  await VehicleMakeModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("VehicleMakeModel", () => {
  it("stores a localized name and enforces a unique slug", async () => {
    const make = await VehicleMakeModel.create({
      name: { fa: "سایپا", en: "Saipa" },
      slug: "saipa",
      country: "Iran",
      isDomestic: true,
    });
    expect(make.name.fa).toBe("سایپا");
    expect(make.isDomestic).toBe(true);

    await expect(
      VehicleMakeModel.create({
        name: { fa: "x", en: "x" },
        slug: "saipa",
        country: "Iran",
        isDomestic: true,
      }),
    ).rejects.toThrow();
  });
});
