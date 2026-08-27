import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { VehicleEngineModel } from "./VehicleEngine.js";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("VehicleEngineModel", () => {
  it("stores displacement in liters and rejects an unknown fuel type", async () => {
    const engine = await VehicleEngineModel.create({
      genId: randomUUID(),
      code: "M15",
      displacement: 1.5,
      fuel: "petrol",
      power: 87,
    });
    expect(engine.displacement).toBe(1.5);

    await expect(
      VehicleEngineModel.create({
        genId: randomUUID(),
        code: "bad-fuel",
        displacement: 1.5,
        fuel: "hydrogen" as never,
        power: 87,
      }),
    ).rejects.toThrow();
  });
});
