import { describe, expect, it } from "vitest";
import { buildVehicleKey, parseVehicleKey } from "./vehicleKey.js";

const makeId = "507f1f77bcf86cd799439011";
const modelId = "507f1f77bcf86cd799439012";
const genId = "507f1f77bcf86cd799439013";
const engineId = "507f1f77bcf86cd799439014";

describe("buildVehicleKey / parseVehicleKey", () => {
  it("round-trips without an engineId", () => {
    const key = buildVehicleKey({ makeId, modelId, genId, year: 2018 });
    expect(parseVehicleKey(key)).toEqual({ makeId, modelId, genId, year: 2018 });
  });

  it("round-trips with an engineId", () => {
    const key = buildVehicleKey({ makeId, modelId, genId, year: 2018, engineId });
    expect(parseVehicleKey(key)).toEqual({ makeId, modelId, genId, year: 2018, engineId });
  });

  it("rejects a key with too few segments", () => {
    expect(() => parseVehicleKey(`${makeId}.${modelId}.${genId}`)).toThrow();
  });

  it("rejects a key with a non-ObjectId segment", () => {
    expect(() => parseVehicleKey(`not-an-id.${modelId}.${genId}.2018`)).toThrow();
  });

  it("rejects a key with a non-numeric year", () => {
    expect(() => parseVehicleKey(`${makeId}.${modelId}.${genId}.not-a-year`)).toThrow();
  });
});
