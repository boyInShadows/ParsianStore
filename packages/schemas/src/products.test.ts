import { describe, expect, it } from "vitest";
import { productsResponseSchema } from "./products.js";

const validProduct = {
  id: "1",
  name: { fa: "لنت ترمز", en: "Brake pad" },
  slug: "brake-pad",
  priceRial: 1500000,
  stock: 12,
  media: [],
  authenticity: {
    supplyRoute: "oem",
    sourceBrand: "Bosch",
    countryOfManufacture: "Germany",
    verificationCode: "VER-BRK-001",
  },
};

describe("productsResponseSchema", () => {
  it("accepts a valid products payload", () => {
    const result = productsResponseSchema.safeParse({
      ok: true,
      data: [validProduct],
      meta: { nextCursor: null, limit: 20 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown supplyRoute", () => {
    const result = productsResponseSchema.safeParse({
      ok: true,
      data: [{ ...validProduct, authenticity: { ...validProduct.authenticity, supplyRoute: "x" } }],
      meta: { nextCursor: null, limit: 20 },
    });
    expect(result.success).toBe(false);
  });
});
