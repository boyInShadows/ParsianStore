import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { VehicleGenModel } from "./VehicleGen.js";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("VehicleGenModel", () => {
  it("defaults facelift to false and allows a null yearTo for an ongoing model", async () => {
    const gen = await VehicleGenModel.create({
      modelId: randomUUID(),
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
        modelId: randomUUID(),
        name: { fa: "x", en: "x" },
      }),
    ).rejects.toThrow();
  });
});
