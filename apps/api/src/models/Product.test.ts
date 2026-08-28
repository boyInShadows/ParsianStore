import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { ProductModel } from "./Product.js";

beforeAll(async () => {
  await resetDb();
  await ProductModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

// verificationCode defaults from `sku` so every distinct-sku call across
// this file gets a naturally unique code — only tests deliberately
// proving the uniqueness constraint itself need to override it to collide
// on purpose.
function baseProduct(overrides: Record<string, unknown> = {}) {
  const sku = (overrides.sku as string | undefined) ?? "SKU-0001";
  return {
    name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
    slug: "front-brake-pad",
    sku,
    brandId: randomUUID(),
    categoryId: randomUUID(),
    priceRial: 1_500_000,
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه ضمانت توسط فروشنده" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${sku}`,
    },
    ...overrides,
  };
}

describe("ProductModel", () => {
  it("creates a product with sensible defaults", async () => {
    const product = await ProductModel.create(baseProduct());
    expect(product.status).toBe("draft");
    expect(product.stock).toBe(0);
    expect(product.lowStockAt).toBe(5);
    expect(product.backorderable).toBe(false);
    expect(product.rating).toEqual({ avg: 0, count: 0 });
    expect(product.attributes).toEqual([]);
    expect(product.media).toEqual([]);
  });

  it("auto-populates a normalized searchText from name/sku/oem/cross-ref numbers", async () => {
    const product = await ProductModel.create(
      baseProduct({
        slug: "front-brake-pad-2",
        sku: "SKU-0002",
        oemNumbers: ["04465-YZZ"],
        crossRefNumbers: ["يك123"],
        authenticity: {
          supplyRoute: "oem",
          sourceBrand: "Bosch",
          countryOfManufacture: "Germany",
          verificationCode: "VER-0002",
        },
      }),
    );
    expect(product.searchText).toContain("لنت ترمز جلو");
    expect(product.searchText).toContain("front brake pad");
    expect(product.searchText).toContain("04465-yzz");
    // normalizeFa() maps Arabic ي/ك -> Persian ی/ک — proves the real
    // utility ran, not just string concatenation.
    expect(product.searchText).toContain("یک123");
  });

  it("re-normalizes searchText on every save, not just creation", async () => {
    const product = await ProductModel.create(baseProduct({ slug: "resave", sku: "SKU-0003" }));
    product.name.en = "Updated Name";
    await product.save();
    expect(product.searchText).toContain("updated name");
  });

  it("enforces unique slug, sku, and authenticity.verificationCode", async () => {
    await ProductModel.create(baseProduct({ slug: "dup-base", sku: "SKU-DUP-BASE" }));

    await expect(
      ProductModel.create(baseProduct({ slug: "dup-base", sku: "SKU-OTHER" })),
    ).rejects.toThrow();

    await expect(
      ProductModel.create(baseProduct({ slug: "other-slug", sku: "SKU-DUP-BASE" })),
    ).rejects.toThrow();

    await expect(
      ProductModel.create(
        baseProduct({
          slug: "other-slug-2",
          sku: "SKU-OTHER-2",
          authenticity: {
            supplyRoute: "oem",
            sourceBrand: "Bosch",
            countryOfManufacture: "Germany",
            // Deliberately reuses the first product's code (which defaults
            // to `VER-SKU-DUP-BASE`) to prove the uniqueness constraint.
            verificationCode: "VER-SKU-DUP-BASE",
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("rejects a supplyRoute outside the fixed §3.5 taxonomy", async () => {
    await expect(
      ProductModel.create(
        baseProduct({
          slug: "bad-supply-route",
          sku: "SKU-BAD-1",
          authenticity: {
            supplyRoute: "smuggled",
            sourceBrand: "Bosch",
            countryOfManufacture: "Germany",
            verificationCode: "VER-BAD-1",
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("rejects a status outside draft|active|archived", async () => {
    await expect(
      ProductModel.create(baseProduct({ slug: "bad-status", sku: "SKU-BAD-2", status: "live" })),
    ).rejects.toThrow();
  });

  it("requires priceRial, weightGram, dimensions, warranty, and authenticity", async () => {
    await expect(
      ProductModel.create({
        name: { fa: "x", en: "x" },
        slug: "missing-fields",
        sku: "SKU-MISSING",
        brandId: randomUUID(),
        categoryId: randomUUID(),
      }),
    ).rejects.toThrow();
  });
});
