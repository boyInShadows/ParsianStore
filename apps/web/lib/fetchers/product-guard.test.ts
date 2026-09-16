import { describe, expect, it } from "vitest";
import type { ProductListItemDto } from "schemas";
import { guardProductListItem } from "./product-guard";

function validProduct(): ProductListItemDto {
  return {
    id: "p1",
    name: { fa: "لنت ترمز", en: "Brake Pad" },
    slug: "brake-pad",
    priceRial: 1_500_000,
    compareAtRial: 1_800_000,
    isWholesalePrice: false,
    stock: 12,
    media: ["https://example.com/a.jpg"],
    systemCode: "SYS-04",
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      hologramCode: "H-1",
      guideUrl: "https://example.com/guide",
      verificationCode: "VER-1",
    },
  };
}

describe("guardProductListItem", () => {
  it("accepts a well-formed product, required fields only", () => {
    const product = validProduct();
    delete (product as Partial<ProductListItemDto>).compareAtRial;
    delete (product as Partial<ProductListItemDto>).systemCode;
    const { authenticity } = product;
    delete (authenticity as Partial<ProductListItemDto["authenticity"]>).hologramCode;
    delete (authenticity as Partial<ProductListItemDto["authenticity"]>).guideUrl;

    expect(guardProductListItem(product)).toBe(true);
  });

  it("accepts a well-formed product with every optional field present", () => {
    expect(guardProductListItem(validProduct())).toBe(true);
  });

  it("rejects a missing required field", () => {
    const product = validProduct() as Record<string, unknown>;
    delete product.slug;
    expect(guardProductListItem(product)).toBe(false);
  });

  it("rejects a wrong-typed field", () => {
    const product = validProduct() as unknown as Record<string, unknown>;
    product.priceRial = "1500000";
    expect(guardProductListItem(product)).toBe(false);
  });

  it("rejects null and non-object input", () => {
    expect(guardProductListItem(null)).toBe(false);
    expect(guardProductListItem(undefined)).toBe(false);
    expect(guardProductListItem("a product")).toBe(false);
    expect(guardProductListItem([])).toBe(false);
  });

  it("rejects an unknown enum value for supplyRoute", () => {
    const product = validProduct();
    (product.authenticity as unknown as Record<string, unknown>).supplyRoute = "counterfeit";
    expect(guardProductListItem(product)).toBe(false);
  });

  it("rejects an unknown enum value for systemCode", () => {
    const product = validProduct() as unknown as Record<string, unknown>;
    product.systemCode = "SYS-99";
    expect(guardProductListItem(product)).toBe(false);
  });

  it("rejects a malformed nested authenticity object", () => {
    const product = validProduct() as unknown as Record<string, unknown>;
    product.authenticity = { supplyRoute: "oem" }; // missing required fields
    expect(guardProductListItem(product)).toBe(false);
  });

  it("rejects media that is not a string array", () => {
    const product = validProduct() as unknown as Record<string, unknown>;
    product.media = "not-an-array";
    expect(guardProductListItem(product)).toBe(false);
  });
});
