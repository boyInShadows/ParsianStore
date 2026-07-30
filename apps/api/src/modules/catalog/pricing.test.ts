import { describe, expect, it } from "vitest";
import { ProductModel } from "../../models/Product.js";
import { resolveEffectivePriceRial, toPublicProductJson } from "./pricing.js";

// Pure transformation logic -- no DB connection needed. `new ProductModel(...)`
// (never `.save()`d) is enough to exercise `.toJSON()`'s transform.
function buildProduct(overrides: Record<string, unknown> = {}) {
  return new ProductModel({
    name: { fa: "لنت ترمز", en: "Brake pad" },
    slug: "brake-pad",
    sku: "SKU-1",
    brandId: "507f1f77bcf86cd799439011",
    categoryId: "507f1f77bcf86cd799439012",
    priceRial: 1_000_000,
    stock: 5,
    weightGram: 500,
    dimensions: { lengthMm: 10, widthMm: 10, heightMm: 10 },
    warranty: { months: 12, text: "۱۲ ماه" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: "VER-1",
    },
    ...overrides,
  });
}

describe("resolveEffectivePriceRial", () => {
  it("returns the wholesale price for a wholesale account when the field is set", () => {
    const product = buildProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    expect(resolveEffectivePriceRial(product, "wholesale")).toBe(850_000);
  });

  it("falls back to retail for a wholesale account when no wholesale price is set", () => {
    const product = buildProduct({ priceRial: 1_000_000 });
    expect(resolveEffectivePriceRial(product, "wholesale")).toBe(1_000_000);
  });

  it("always returns retail for a retail account, even if wholesalePriceRial is set", () => {
    const product = buildProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    expect(resolveEffectivePriceRial(product, "retail")).toBe(1_000_000);
  });

  it("always returns retail for a guest (undefined accountType)", () => {
    const product = buildProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    expect(resolveEffectivePriceRial(product, undefined)).toBe(1_000_000);
  });
});

describe("toPublicProductJson", () => {
  it("never leaks the raw wholesalePriceRial field, for any viewer", () => {
    const product = buildProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    const wholesaleJson = toPublicProductJson(product, "wholesale");
    const retailJson = toPublicProductJson(product, "retail");
    const guestJson = toPublicProductJson(product, undefined);

    expect(wholesaleJson).not.toHaveProperty("wholesalePriceRial");
    expect(retailJson).not.toHaveProperty("wholesalePriceRial");
    expect(guestJson).not.toHaveProperty("wholesalePriceRial");
    expect(JSON.stringify(wholesaleJson)).not.toContain("wholesalePriceRial");
  });

  it("overrides priceRial with the resolved effective price and sets isWholesalePrice", () => {
    const product = buildProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    const wholesaleJson = toPublicProductJson(product, "wholesale");
    expect(wholesaleJson.priceRial).toBe(850_000);
    expect(wholesaleJson.isWholesalePrice).toBe(true);

    const retailJson = toPublicProductJson(product, "retail");
    expect(retailJson.priceRial).toBe(1_000_000);
    expect(retailJson.isWholesalePrice).toBe(false);
  });

  it("drops compareAtRial for a wholesale viewer but keeps it for retail/guest", () => {
    const product = buildProduct({
      priceRial: 1_000_000,
      compareAtRial: 1_200_000,
      wholesalePriceRial: 850_000,
    });
    expect(toPublicProductJson(product, "wholesale").compareAtRial).toBeUndefined();
    expect(toPublicProductJson(product, "retail").compareAtRial).toBe(1_200_000);
    expect(toPublicProductJson(product, undefined).compareAtRial).toBe(1_200_000);
  });
});
