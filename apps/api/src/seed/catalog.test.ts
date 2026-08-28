import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildVehicleKey, parseVehicleKey } from "schemas";
import { prisma } from "../config/prisma.js";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { checkFitment } from "../modules/fitment/fitment.service.js";
import { PostgresSearchProvider } from "../providers/search/PostgresSearchProvider.js";
import { CATEGORY_TEMPLATES } from "./catalog.data.js";
import { seedCatalog } from "./catalog.js";

beforeAll(async () => {
  await resetDb();
}, 60_000);

afterAll(async () => {
  await disconnectDB();
});

describe("seedCatalog", () => {
  it("creates >= 300 products across >= 8 categories and >= 15 brands, each with a Fitment record", async () => {
    await seedCatalog();

    const productCount = await prisma.product.count();
    expect(productCount).toBeGreaterThanOrEqual(300);

    // `distinct` is a query option now rather than its own method.
    const categoriesUsed = await prisma.product.findMany({
      distinct: ["categoryId"],
      select: { categoryId: true },
    });
    expect(categoriesUsed.length).toBeGreaterThanOrEqual(8);

    const brandsUsed = await prisma.product.findMany({
      distinct: ["brandId"],
      select: { brandId: true },
    });
    expect(brandsUsed.length).toBeGreaterThanOrEqual(15);

    const fitmentCount = await prisma.fitment.count();
    expect(fitmentCount).toBe(productCount);
  }, 60_000);

  it("is idempotent — running it again does not create duplicates", async () => {
    await seedCatalog();
    const first = await prisma.product.count();
    await seedCatalog();
    const second = await prisma.product.count();
    expect(second).toBe(first);
  }, 120_000);

  it("only uses vehicle makes from the real Saipa/Iran Khodro seed tree (ADR 0004)", async () => {
    await seedCatalog();
    const fitments = await prisma.fitment.findMany({ take: 50, include: { make: true } });
    expect(fitments.every((fitment) => ["saipa", "iran-khodro"].includes(fitment.make.slug))).toBe(
      true,
    );
  }, 60_000);

  it("GATE 3->4: fitment lookups return correct verdicts for 20 real product<->vehicle pairs", async () => {
    await seedCatalog();

    // `$sample` has no Prisma equivalent; ordering by a random value is the
    // SQL way to say the same thing, and `take` keeps it to 20.
    const sampled = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Fitment" WHERE "deletedAt" IS NULL ORDER BY random() LIMIT 20
    `;
    expect(sampled.length).toBe(20);

    for (const sample of sampled) {
      const fitment = await prisma.fitment.findUnique({ where: { id: sample.id } });
      expect(fitment).not.toBeNull();

      // The exact vehicle this Fitment record targets must verify as "exact".
      const matchingKey = buildVehicleKey({
        makeId: fitment!.makeId,
        modelId: fitment!.modelId,
        genId: fitment!.genId!,
        year: fitment!.yearFrom,
      });
      const matchingVerdict = await checkFitment(fitment!.productId, parseVehicleKey(matchingKey));
      expect(matchingVerdict.confidence).toBe("exact");

      // An unrelated random vehicle must never false-positive.
      const unrelatedKey = buildVehicleKey({
        makeId: randomUUID(),
        modelId: randomUUID(),
        genId: randomUUID(),
        year: fitment!.yearFrom,
      });
      const unrelatedVerdict = await checkFitment(
        fitment!.productId,
        parseVehicleKey(unrelatedKey),
      );
      expect(unrelatedVerdict.confidence).toBeNull();
    }
  }, 60_000);

  it("every seeded category matches one of the >= 8 catalog systems", async () => {
    await seedCatalog();
    const categories = await prisma.category.findMany();
    expect(categories.length).toBe(CATEGORY_TEMPLATES.length);
  });

  it("every seeded brand persists with its real name/country", async () => {
    await seedCatalog();
    const bosch = await prisma.brand.findUnique({ where: { slug: "bosch" } });
    expect(bosch?.nameFa).toBe("بوش");
    expect(bosch?.country).toBe("Germany");
  });

  // Real regression: the seed writes with upserts, which under Mongoose was
  // query middleware -- so Product's pre("save") hook never fired and
  // searchText silently stayed empty for every seeded product, until it was
  // caught building P5.S3's search page. The derive is an explicit function
  // call now (searchText.ts says why), and this still asserts it happened,
  // both at the data level and through the search path a shopper uses.
  it("populates searchText for every seeded product (not left empty by the upsert path)", async () => {
    await seedCatalog();
    const withEmptySearchText = await prisma.product.count({ where: { searchText: "" } });
    expect(withEmptySearchText).toBe(0);
  }, 60_000);

  // P6.S1: dev/test fixture for wholesale pricing -- every seeded product
  // gets a computed wholesalePriceRial, always <= its own priceRial.
  it("populates wholesalePriceRial for every seeded product, always <= priceRial", async () => {
    await seedCatalog();
    const products = await prisma.product.findMany({
      select: { priceRial: true, wholesalePriceRial: true },
    });
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.wholesalePriceRial).not.toBeNull();
      expect(product.wholesalePriceRial!).toBeLessThanOrEqual(product.priceRial);
    }
  }, 60_000);

  it("is findable through the search provider by a real Persian substring", async () => {
    await seedCatalog();
    const brakePad = await prisma.product.findFirst({ where: { nameFa: { contains: "ترمز" } } });
    expect(brakePad).not.toBeNull();

    const provider = new PostgresSearchProvider();
    const { data } = await provider.searchProducts("ترمز", {}, { page: 1, limit: 20 });
    expect(data.map((product) => product.id)).toContain(brakePad!.id);
  }, 60_000);
});
