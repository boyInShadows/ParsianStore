import { describe, expect, it } from "vitest";
import {
  vehicleGenerationsResponseSchema,
  vehicleMakesResponseSchema,
  vehicleModelsResponseSchema,
} from "./vehicles.js";

const meta = { total: 1, page: 1, limit: 100 };

describe("vehicleMakesResponseSchema", () => {
  it("accepts a valid makes payload", () => {
    const result = vehicleMakesResponseSchema.safeParse({
      ok: true,
      data: [{ id: "1", name: { fa: "سایپا", en: "Saipa" }, slug: "saipa" }],
      meta,
    });
    expect(result.success).toBe(true);
  });
});

describe("vehicleModelsResponseSchema", () => {
  it("accepts a valid models payload", () => {
    const result = vehicleModelsResponseSchema.safeParse({
      ok: true,
      data: [{ id: "1", makeId: "m1", name: { fa: "پراید", en: "Pride" }, slug: "pride" }],
      meta,
    });
    expect(result.success).toBe(true);
  });
});

describe("vehicleGenerationsResponseSchema", () => {
  it("accepts an open-ended generation (yearTo: null)", () => {
    const result = vehicleGenerationsResponseSchema.safeParse({
      ok: true,
      data: [
        {
          id: "1",
          modelId: "m1",
          name: { fa: "نسل یک", en: "Gen 1" },
          yearFrom: 2011,
          yearTo: null,
        },
      ],
      meta,
    });
    expect(result.success).toBe(true);
  });
});
