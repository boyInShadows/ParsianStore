import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { VehicleEngineModel } from "./VehicleEngine.js";

const TEST_URI = testDbUri("parsian-store-test-vehicle-engine");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("VehicleEngineModel", () => {
  it("stores displacement in liters and rejects an unknown fuel type", async () => {
    const engine = await VehicleEngineModel.create({
      genId: new mongoose.Types.ObjectId(),
      code: "M15",
      displacement: 1.5,
      fuel: "petrol",
      power: 87,
    });
    expect(engine.displacement).toBe(1.5);

    await expect(
      VehicleEngineModel.create({
        genId: new mongoose.Types.ObjectId(),
        code: "bad-fuel",
        displacement: 1.5,
        fuel: "hydrogen" as never,
        power: 87,
      }),
    ).rejects.toThrow();
  });
});
