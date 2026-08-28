import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { FitmentModel } from "./Fitment.js";

beforeAll(async () => {
  await resetDb();
  await FitmentModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("FitmentModel", () => {
  it("allows genId/engineId to be omitted and yearTo to be null (ongoing fitment)", async () => {
    const fitment = await FitmentModel.create({
      productId: randomUUID(),
      makeId: randomUUID(),
      modelId: randomUUID(),
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
        productId: randomUUID(),
        makeId: randomUUID(),
        modelId: randomUUID(),
        yearFrom: 2015,
        confidence: "maybe",
      }),
    ).rejects.toThrow();
  });

  it("requires productId, makeId, modelId, and yearFrom", async () => {
    await expect(FitmentModel.create({ confidence: "exact" })).rejects.toThrow();
  });
});
