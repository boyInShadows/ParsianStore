import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { VehicleMakeModel } from "./VehicleMake.js";

const TEST_URI = testDbUri("parsian-store-test-vehicle-make");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await VehicleMakeModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
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
