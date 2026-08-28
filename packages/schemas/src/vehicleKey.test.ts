import { describe, expect, it } from "vitest";
import { buildVehicleKey, parseVehicleKey } from "./vehicleKey.js";

// UUIDs, not the 24-hex ObjectIds this file was written with: the shared
// `idSchema` moved to UUID v7 at P10 and `isId` moved with it, but this test
// was missed -- so both round-trip cases had been failing ever since,
// unnoticed because the API suite does not cover this package.
const makeId = "01a04993-304b-711b-bc3b-07984d11e822";
const modelId = "01a04993-30e5-73da-9a74-4056b27d7dab";
const genId = "01a04993-3a94-76ce-bf53-e0e6356e99f0";
const engineId = "01a04993-3a9b-767b-a305-debb16a8d600";

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
