import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { buildVehicleKey, parseVehicleKey } from "schemas";
import { testDbUri } from "../config/testDbUri.js";
import { checkFitment } from "../modules/fitment/fitment.service.js";
import { BrandModel } from "../models/Brand.js";
import { CategoryModel } from "../models/Category.js";
import { FitmentModel } from "../models/Fitment.js";
import { ProductModel } from "../models/Product.js";
import { VehicleMakeModel } from "../models/VehicleMake.js";
import { MongoSearchProvider } from "../providers/search/MongoSearchProvider.js";
import { CATEGORY_TEMPLATES } from "./catalog.data.js";
import { seedCatalog } from "./catalog.js";

const TEST_URI = testDbUri("parsian-store-test-seed-catalog");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await ProductModel.init();
}, 60_000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("seedCatalog", () => {
  it("creates >= 300 products across >= 8 categories and >= 15 brands, each with a Fitment record", async () => {
    await seedCatalog();

    const productCount = await ProductModel.countDocuments({});
    expect(productCount).toBeGreaterThanOrEqual(300);

    const categoriesUsed = await ProductModel.distinct("categoryId");
    expect(categoriesUsed.length).toBeGreaterThanOrEqual(8);

    const brandsUsed = await ProductModel.distinct("brandId");
    expect(brandsUsed.length).toBeGreaterThanOrEqual(15);

    const fitmentCount = await FitmentModel.countDocuments({});
    expect(fitmentCount).toBe(productCount);
  }, 60_000);

  it("is idempotent — running it again does not create duplicates", async () => {
    await seedCatalog();
    const first = await ProductModel.countDocuments({});
    await seedCatalog();
    const second = await ProductModel.countDocuments({});
    expect(second).toBe(first);
  }, 120_000);

  it("only uses vehicle makes from the real Saipa/Iran Khodro seed tree (ADR 0004)", async () => {
    await seedCatalog();
    const fitments = await FitmentModel.find({}).limit(50);
    const makeIds = [...new Set(fitments.map((f) => f.makeId.toString()))];
    const makes = await VehicleMakeModel.find({ _id: { $in: makeIds } });
    expect(makes.every((m) => ["saipa", "iran-khodro"].includes(m.slug))).toBe(true);
  }, 60_000);

  it("GATE 3->4: /fitment/check-equivalent lookups return correct verdicts for 20 real product<->vehicle pairs", async () => {
    await seedCatalog();

    const fitments = await FitmentModel.aggregate<{ _id: unknown }>([{ $sample: { size: 20 } }]);
    expect(fitments.length).toBe(20);

    for (const sample of fitments) {
      const fitment = await FitmentModel.findById(sample._id);
      expect(fitment).not.toBeNull();

      // The exact vehicle this Fitment record targets must verify as "exact".
      const matchingKey = buildVehicleKey({
        makeId: fitment!.makeId.toString(),
        modelId: fitment!.modelId.toString(),
        genId: fitment!.genId!.toString(),
        year: fitment!.yearFrom,
      });
      const matchingVerdict = await checkFitment(
        fitment!.productId.toString(),
        parseVehicleKey(matchingKey),
      );
      expect(matchingVerdict.confidence).toBe("exact");

      // An unrelated random vehicle must never false-positive.
      const unrelatedKey = buildVehicleKey({
        makeId: new mongoose.Types.ObjectId().toString(),
        modelId: new mongoose.Types.ObjectId().toString(),
        genId: new mongoose.Types.ObjectId().toString(),
        year: fitment!.yearFrom,
      });
      const unrelatedVerdict = await checkFitment(
        fitment!.productId.toString(),
        parseVehicleKey(unrelatedKey),
      );
      expect(unrelatedVerdict.confidence).toBeNull();
    }
  }, 60_000);

  it("every seeded category matches one of the >= 8 catalog systems", async () => {
    await seedCatalog();
    const categories = await CategoryModel.find({});
    expect(categories.length).toBe(CATEGORY_TEMPLATES.length);
  });

  it("every seeded brand persists with its real name/country", async () => {
    await seedCatalog();
    const bosch = await BrandModel.findOne({ slug: "bosch" });
    expect(bosch?.name.fa).toBe("بوش");
    expect(bosch?.country).toBe("Germany");
  });

  // Real regression: seedCatalog upserts via findOneAndUpdate, which is
  // Mongoose query middleware -- Product's pre("save") hook (document
  // middleware) never fires for it, so searchText silently stayed empty
  // for every seeded product until this was caught building P5.S3's
  // search results page (search against the real seeded catalog was
  // non-functional -- both the $text and substring-regex legs of
  // MongoSearchProvider depend on searchText). Asserts the fix at both
  // the data level and through the actual search path a shopper uses.
  it("populates searchText for every seeded product (not left empty by the upsert path)", async () => {
    await seedCatalog();
    const withEmptySearchText = await ProductModel.countDocuments({ searchText: "" });
    expect(withEmptySearchText).toBe(0);
  }, 60_000);

  // P6.S1: dev/test fixture for wholesale pricing -- every seeded product
  // gets a computed wholesalePriceRial, always <= its own priceRial (the
  // Product schema's own validator would reject the opposite).
  it("populates wholesalePriceRial for every seeded product, always <= priceRial", async () => {
    await seedCatalog();
    const products = await ProductModel.find({}).select("+wholesalePriceRial");
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.wholesalePriceRial).not.toBeUndefined();
      expect(product.wholesalePriceRial!).toBeLessThanOrEqual(product.priceRial);
    }
  }, 60_000);

  it("is actually findable through MongoSearchProvider.searchProducts by a real Persian substring", async () => {
    await seedCatalog();
    const brakePad = await ProductModel.findOne({ "name.fa": /ترمز/ });
    expect(brakePad).not.toBeNull();

    const provider = new MongoSearchProvider();
    const { data } = await provider.searchProducts("ترمز", {}, { page: 1, limit: 20 });
    expect(data.map((p) => p.id)).toContain(brakePad!.id as string);
  }, 60_000);
});
