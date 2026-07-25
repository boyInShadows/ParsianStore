import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { VehicleGenModel } from "./VehicleGen.js";

const TEST_URI = testDbUri("parsian-store-test-vehicle-gen");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("VehicleGenModel", () => {
  it("defaults facelift to false and allows a null yearTo for an ongoing model", async () => {
    const gen = await VehicleGenModel.create({
      modelId: new mongoose.Types.ObjectId(),
      name: { fa: "پایه", en: "Base" },
      yearFrom: 2018,
      yearTo: null,
    });
    expect(gen.facelift).toBe(false);
    expect(gen.yearTo).toBeNull();
  });

  it("requires yearFrom", async () => {
    await expect(
      VehicleGenModel.create({
        modelId: new mongoose.Types.ObjectId(),
        name: { fa: "x", en: "x" },
      }),
    ).rejects.toThrow();
  });
});
