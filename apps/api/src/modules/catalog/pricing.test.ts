import { describe, expect, it } from "vitest";
import { resolveEffectivePriceRial, toProductListItem, type ProductRow } from "./pricing.js";

/**
 * Pure transformation logic -- no database connection needed.
 *
 * A plain object rather than an unsaved Mongoose document: the mapper takes a
 * row now, and `toJSON()` -- which is what the old fixture was really
 * exercising -- no longer exists. That is the shape of the whole change here:
 * the model used to hide `wholesalePriceRial` with `select: false` and this
 * function was the second line of defence, where now it is the only one.
 */
function buildProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "00000000-0000-7000-8000-000000000001",
    nameFa: "لنت ترمز",
    nameEn: "Brake pad",
    slug: "brake-pad",
    sku: "SKU-1",
    oemNumbers: [],
    crossRefNumbers: [],
    brandId: "00000000-0000-7000-8000-000000000002",
    categoryId: "00000000-0000-7000-8000-000000000003",
    media: [],
    priceRial: 1_000_000,
    compareAtRial: null,
    wholesalePriceRial: null,
    stock: 5,
    weightGram: 500,
    lengthMm: 10,
    widthMm: 10,
    heightMm: 10,
    warrantyMonths: 12,
    warrantyText: "۱۲ ماه",
    supplyRoute: "oem",
    sourceBrand: "Bosch",
    countryOfManufacture: "Germany",
    hologramCode: null,
    guideUrl: null,
    verificationCode: "VER-1",
    ratingAvg: 0,
    ratingCount: 0,
    ...overrides,
  };
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

describe("toProductListItem", () => {
  it("never leaks the raw wholesalePriceRial field, for any viewer", () => {
    const product = buildProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    const wholesaleJson = toProductListItem(product, "wholesale");
    const retailJson = toProductListItem(product, "retail");
    const guestJson = toProductListItem(product, undefined);

    expect(wholesaleJson).not.toHaveProperty("wholesalePriceRial");
    expect(retailJson).not.toHaveProperty("wholesalePriceRial");
    expect(guestJson).not.toHaveProperty("wholesalePriceRial");
    expect(JSON.stringify(wholesaleJson)).not.toContain("wholesalePriceRial");
  });

  it("overrides priceRial with the resolved effective price and sets isWholesalePrice", () => {
    const product = buildProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    const wholesaleJson = toProductListItem(product, "wholesale");
    expect(wholesaleJson.priceRial).toBe(850_000);
    expect(wholesaleJson.isWholesalePrice).toBe(true);

    const retailJson = toProductListItem(product, "retail");
    expect(retailJson.priceRial).toBe(1_000_000);
    expect(retailJson.isWholesalePrice).toBe(false);
  });

  it("drops compareAtRial for a wholesale viewer but keeps it for retail/guest", () => {
    const product = buildProduct({
      priceRial: 1_000_000,
      compareAtRial: 1_200_000,
      wholesalePriceRial: 850_000,
    });
    expect(toProductListItem(product, "wholesale").compareAtRial).toBeUndefined();
    expect(toProductListItem(product, "retail").compareAtRial).toBe(1_200_000);
    expect(toProductListItem(product, undefined).compareAtRial).toBe(1_200_000);
  });

  // The hyphenated supply routes are stored underscored, and the DTO must
  // speak the wire spelling -- the bridge is one call in serialize.ts, and
  // nothing else in the system would notice if it were missing.
  it("emits the wire spelling of a hyphenated supply route", () => {
    const product = buildProduct({ supplyRoute: "genuine_imported" });
    expect(toProductListItem(product, undefined).authenticity.supplyRoute).toBe("genuine-imported");
  });
});
