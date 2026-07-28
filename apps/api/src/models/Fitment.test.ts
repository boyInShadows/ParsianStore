import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { FitmentModel } from "./Fitment.js";

const TEST_URI = testDbUri("parsian-store-test-fitment");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await FitmentModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("FitmentModel", () => {
  it("allows genId/engineId to be omitted and yearTo to be null (ongoing fitment)", async () => {
    const fitment = await FitmentModel.create({
      productId: new mongoose.Types.ObjectId(),
      makeId: new mongoose.Types.ObjectId(),
      modelId: new mongoose.Types.ObjectId(),
      yearFrom: 2015,
      yearTo: null,
      confidence: "likely",
    });
    expect(fitment.genId).toBeUndefined();
    expect(fitment.engineId).toBeUndefined();
    expect(fitment.yearTo).toBeNull();
  });

  it("rejects a confidence outside exact|likely|check", async () => {
    await expect(
      FitmentModel.create({
        productId: new mongoose.Types.ObjectId(),
        makeId: new mongoose.Types.ObjectId(),
        modelId: new mongoose.Types.ObjectId(),
        yearFrom: 2015,
        confidence: "maybe",
      }),
    ).rejects.toThrow();
  });

  it("requires productId, makeId, modelId, and yearFrom", async () => {
    await expect(FitmentModel.create({ confidence: "exact" })).rejects.toThrow();
  });
});
