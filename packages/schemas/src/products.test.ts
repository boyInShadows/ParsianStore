import { describe, expect, it } from "vitest";
import {
  productDetailResponseSchema,
  productsResponseSchema,
  searchProductsResponseSchema,
} from "./products.js";

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

describe("productDetailResponseSchema", () => {
  it("accepts a valid product detail payload with brand/category", () => {
    const result = productDetailResponseSchema.safeParse({
      ok: true,
      data: {
        ...validProduct,
        sku: "SKU-1",
        oemNumbers: ["04465-YZZ"],
        crossRefNumbers: [],
        attributes: [{ key: "color", keyLabel: "رنگ", value: "قرمز" }],
        warranty: { months: 12, text: "۱۲ ماه" },
        dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
        weightGram: 800,
        rating: { avg: 0, count: 0 },
        brand: { id: "b1", name: { fa: "بوش", en: "Bosch" }, slug: "bosch" },
        category: { id: "c1", name: { fa: "ترمز", en: "Brakes" }, slug: "brakes", path: [] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts null brand/category (soft-deleted or missing reference)", () => {
    const result = productDetailResponseSchema.safeParse({
      ok: true,
      data: {
        ...validProduct,
        sku: "SKU-1",
        oemNumbers: [],
        crossRefNumbers: [],
        attributes: [],
        warranty: { months: 12, text: "۱۲ ماه" },
        dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
        weightGram: 800,
        rating: { avg: 0, count: 0 },
        brand: null,
        category: null,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("searchProductsResponseSchema", () => {
  it("accepts a valid search results payload (page/limit meta, not cursor)", () => {
    const result = searchProductsResponseSchema.safeParse({
      ok: true,
      data: [validProduct],
      meta: { total: 1, page: 1, limit: 20 },
    });
    expect(result.success).toBe(true);
  });
});
