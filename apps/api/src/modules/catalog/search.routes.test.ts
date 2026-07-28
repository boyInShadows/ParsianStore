import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";

const TEST_URI = testDbUri("parsian-store-test-search-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  // $text queries (MongoSearchProvider) need the text index actually
  // built — Mongoose's autoIndex runs it asynchronously on connect, so
  // without waiting here the first search test could race a query
  // against an index that isn't ready yet.
  await ProductModel.init();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await Promise.all([
    ProductModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    BrandModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { total: number };
}

async function seedProduct() {
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
  return ProductModel.create({
    name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
    slug: "front-brake-pad",
    sku: "SKU-SEARCH-1",
    brandId: brand._id,
    categoryId: category._id,
    priceRial: 1_500_000,
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه" },
    status: "active",
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: "VER-SEARCH-1",
    },
  });
}

describe("GET /catalog/search", () => {
  it("finds a product by a normalized Persian query", async () => {
    const product = await seedProduct();
    const res = await fetch(`${baseUrl}/api/v1/catalog/search?q=${encodeURIComponent("ترمز")}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ id: string }[]>;
    expect(body.data.map((p) => p.id)).toContain(product.id);
  });

  it("browses all active products when q is omitted", async () => {
    await seedProduct();
    const res = await fetch(`${baseUrl}/api/v1/catalog/search`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.meta?.total).toBe(1);
  });

  it("rejects a malformed vehicle key with 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/search?vehicle=not-a-key`);
    expect(res.status).toBe(400);
  });
});

describe("GET /catalog/facets", () => {
  it("returns category/brand/stock facet counts", async () => {
    await seedProduct();
    const res = await fetch(`${baseUrl}/api/v1/catalog/facets`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{
      categories: unknown[];
      brands: unknown[];
      stock: unknown[];
      attributes: unknown[];
    }>;
    expect(body.data.categories).toHaveLength(1);
    expect(body.data.brands).toHaveLength(1);
  });
});
