import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../../config/testDb.js";
import { AttributeModel } from "../../models/Attribute.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { FitmentModel } from "../../models/Fitment.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { MongoSearchProvider } from "./MongoSearchProvider.js";

const provider = new MongoSearchProvider();

beforeAll(async () => {
  await resetDb();
  await ProductModel.init();
});

beforeEach(async () => {
  await Promise.all([
    ProductModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    BrandModel.deleteMany({}),
    FitmentModel.deleteMany({}),
    AttributeModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await disconnectDB();
});

async function seedCatalog() {
  const brand = await BrandModel.create({
    name: { fa: "بوش", en: "Bosch" },
    slug: "bosch",
    country: "Germany",
  });
  const category = await CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: "brakes",
    systemCode: "SYS-04",
  });
  return { brand, category };
}

function productInput(overrides: Partial<Product> & Record<string, unknown>) {
  const sku = (overrides.sku as string) ?? `SKU-${randomUUID()}`;
  return {
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه" },
    status: "active",
    stock: 10,
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${sku}`,
    },
    ...overrides,
    sku,
  };
}

describe("MongoSearchProvider.searchProducts", () => {
  it("matches a full-word query via the normalized text index", async () => {
    const { brand, category } = await seedCatalog();
    const product = await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
        slug: "front-brake-pad",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_500_000,
      }),
    );

    const { data } = await provider.searchProducts("ترمز", {}, { page: 1, limit: 20 });
    expect(data.map((p) => p.id)).toContain(product.id);
  });

  it("matches a partial-word (prefix-style) query via the substring fallback", async () => {
    const { brand, category } = await seedCatalog();
    const product = await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
        slug: "front-brake-pad-2",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_500_000,
      }),
    );

    // "ترم" is a prefix of "ترمز", not a whole token — $text alone (no
    // stemming) would miss it; the point of this test is that the
    // provider still finds it.
    const { data } = await provider.searchProducts("ترم", {}, { page: 1, limit: 20 });
    expect(data.map((p) => p.id)).toContain(product.id);
  });

  it("matches an exact OEM number regardless of case", async () => {
    const { brand, category } = await seedCatalog();
    const product = await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
        slug: "front-brake-pad-3",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_500_000,
        oemNumbers: ["04465-YZZ"],
      }),
    );

    const { data } = await provider.searchProducts("04465-yzz", {}, { page: 1, limit: 20 });
    expect(data.map((p) => p.id)).toContain(product.id);
  });

  it("excludes draft/archived products", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز عقب", en: "Rear brake pad" },
        slug: "rear-brake-pad",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        status: "draft",
      }),
    );

    const { data } = await provider.searchProducts("ترمز", {}, { page: 1, limit: 20 });
    expect(data).toHaveLength(0);
  });

  it("browses (no query) restricted to a fitting vehicle", async () => {
    const { brand, category } = await seedCatalog();
    const fitting = await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
        slug: "fitting-product",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_500_000,
      }),
    );
    const notFitting = await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز عقب", en: "Rear brake pad" },
        slug: "non-fitting-product",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
      }),
    );
    const makeId = randomUUID();
    const modelId = randomUUID();
    await FitmentModel.create({
      productId: fitting._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });

    const { data } = await provider.searchProducts(
      "",
      {
        vehicle: {
          makeId: makeId.toString(),
          modelId: modelId.toString(),
          genId: randomUUID(),
          year: 2018,
        },
      },
      { page: 1, limit: 20 },
    );
    expect(data.map((p) => p.id)).toEqual([fitting.id]);
    expect(data.map((p) => p.id)).not.toContain(notFitting.id);
  });
});

describe("MongoSearchProvider.getFacets", () => {
  it("counts active products per category and brand, and by stock state", async () => {
    const { brand, category } = await seedCatalog();
    const otherBrand = await BrandModel.create({
      name: { fa: "والئو", en: "Valeo" },
      slug: "valeo",
      country: "France",
    });

    await ProductModel.create(
      productInput({
        name: { fa: "الف", en: "A" },
        slug: "product-a",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        stock: 5,
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "ب", en: "B" },
        slug: "product-b",
        brandId: otherBrand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        stock: 0,
      }),
    );

    const facets = await provider.getFacets({});
    expect(facets.categories).toEqual([
      { id: category.id, name: category.name, slug: category.slug, count: 2 },
    ]);
    expect(facets.brands.sort((a, b) => a.slug.localeCompare(b.slug))).toEqual(
      [
        { id: brand.id, name: brand.name, slug: brand.slug, count: 1 },
        { id: otherBrand.id, name: otherBrand.name, slug: otherBrand.slug, count: 1 },
      ].sort((a, b) => a.slug.localeCompare(b.slug)),
    );
    expect(facets.stock.sort((a, b) => Number(a.inStock) - Number(b.inStock))).toEqual([
      { inStock: false, count: 1 },
      { inStock: true, count: 1 },
    ]);
    expect(facets.attributes).toEqual([]);
  });

  it("does not zero out a facet's own dimension when that dimension is filtered (OR-facet behavior)", async () => {
    const { brand, category } = await seedCatalog();
    const otherCategory = await CategoryModel.create({
      name: { fa: "جلوبندی", en: "Suspension" },
      slug: "suspension",
      systemCode: "SYS-05",
    });

    await ProductModel.create(
      productInput({
        name: { fa: "الف", en: "A" },
        slug: "product-a",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "ب", en: "B" },
        slug: "product-b",
        brandId: brand._id,
        categoryId: otherCategory._id,
        priceRial: 1_000_000,
      }),
    );

    // Filtering to `category` must still report `otherCategory`'s count in
    // the categories bucket (so the UI can show "Suspension (1)" as a
    // switchable option) -- it would incorrectly disappear if the
    // category's own filter weren't excluded from its own bucket query.
    const facets = await provider.getFacets({ category: category.slug });
    expect(facets.categories.sort((a, b) => a.slug.localeCompare(b.slug))).toEqual(
      [
        { id: category.id, name: category.name, slug: category.slug, count: 1 },
        { id: otherCategory.id, name: otherCategory.name, slug: otherCategory.slug, count: 1 },
      ].sort((a, b) => a.slug.localeCompare(b.slug)),
    );
    // Brand bucket must still respect the active category filter, though
    // (it isn't the excluded dimension) -- both products are brand `brand`,
    // but only the one in `category` should count here.
    expect(facets.brands).toEqual([{ id: brand.id, name: brand.name, slug: brand.slug, count: 1 }]);
  });

  it("returns attribute-value facet buckets hydrated with the attribute's display name", async () => {
    const { brand, category } = await seedCatalog();
    await AttributeModel.create({
      name: "رنگ",
      key: "color",
      type: "select",
      options: ["قرمز", "آبی"],
    });

    await ProductModel.create(
      productInput({
        name: { fa: "الف", en: "A" },
        slug: "product-a",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        attributes: [{ key: "color", value: "قرمز" }],
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "ب", en: "B" },
        slug: "product-b",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        attributes: [{ key: "color", value: "قرمز" }],
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "ج", en: "C" },
        slug: "product-c",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        attributes: [{ key: "color", value: "آبی" }],
      }),
    );

    const facets = await provider.getFacets({});
    expect(facets.attributes.sort((a, b) => a.value.localeCompare(b.value))).toEqual(
      [
        { key: "color", keyLabel: "رنگ", value: "قرمز", count: 2 },
        { key: "color", keyLabel: "رنگ", value: "آبی", count: 1 },
      ].sort((a, b) => a.value.localeCompare(b.value)),
    );
  });
});
