import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { buildVehicleKey } from "schemas";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { FitmentModel } from "../../models/Fitment.js";
import { ProductModel } from "../../models/Product.js";

const TEST_URI = testDbUri("parsian-store-test-fitment-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
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
    FitmentModel.deleteMany({}),
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
  meta?: { total: number; page: number; limit: number };
}

async function seedProduct(overrides: Record<string, unknown> = {}) {
  const brand = await BrandModel.create({
    name: { fa: "بوش", en: "Bosch" },
    slug: `bosch-${new mongoose.Types.ObjectId().toString()}`,
    country: "Germany",
  });
  const category = await CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: `brakes-${new mongoose.Types.ObjectId().toString()}`,
    systemCode: "SYS-04",
  });
  const sku = `SKU-${new mongoose.Types.ObjectId().toString()}`;
  return ProductModel.create({
    name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
    slug: `front-brake-pad-${sku}`,
    sku,
    brandId: brand._id,
    categoryId: category._id,
    priceRial: 1_500_000,
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${sku}`,
    },
    ...overrides,
  });
}

describe("GET /fitment/check", () => {
  it("returns confidence: null when no fitment record exists", async () => {
    const product = await seedProduct();
    const vehicleKey = buildVehicleKey({
      makeId: new mongoose.Types.ObjectId().toString(),
      modelId: new mongoose.Types.ObjectId().toString(),
      genId: new mongoose.Types.ObjectId().toString(),
      year: 2020,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product._id.toString()}&vehicleKey=${vehicleKey}`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ confidence: string | null }>;
    expect(body.data.confidence).toBeNull();
  });

  it("matches a make/model-only record across any generation and year within range", async () => {
    const product = await seedProduct();
    const makeId = new mongoose.Types.ObjectId();
    const modelId = new mongoose.Types.ObjectId();

    await FitmentModel.create({
      productId: product._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "likely",
      note: "برای همه نسل‌ها",
    });

    const vehicleKey = buildVehicleKey({
      makeId: makeId.toString(),
      modelId: modelId.toString(),
      genId: new mongoose.Types.ObjectId().toString(),
      year: 2022,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product._id.toString()}&vehicleKey=${vehicleKey}`,
    );
    const body = (await res.json()) as Envelope<{ confidence: string; note: string }>;
    expect(body.data.confidence).toBe("likely");
    expect(body.data.note).toBe("برای همه نسل‌ها");
  });

  it("prefers the more specific (engine-scoped) record over a broader match", async () => {
    const product = await seedProduct();
    const makeId = new mongoose.Types.ObjectId();
    const modelId = new mongoose.Types.ObjectId();
    const genId = new mongoose.Types.ObjectId();
    const engineId = new mongoose.Types.ObjectId();

    await FitmentModel.create({
      productId: product._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "check",
    });
    await FitmentModel.create({
      productId: product._id,
      makeId,
      modelId,
      genId,
      engineId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: makeId.toString(),
      modelId: modelId.toString(),
      genId: genId.toString(),
      year: 2015,
      engineId: engineId.toString(),
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product._id.toString()}&vehicleKey=${vehicleKey}`,
    );
    const body = (await res.json()) as Envelope<{ confidence: string }>;
    expect(body.data.confidence).toBe("exact");
  });

  it("does not match when the vehicle year is outside [yearFrom, yearTo]", async () => {
    const product = await seedProduct();
    const makeId = new mongoose.Types.ObjectId();
    const modelId = new mongoose.Types.ObjectId();

    await FitmentModel.create({
      productId: product._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: 2015,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: makeId.toString(),
      modelId: modelId.toString(),
      genId: new mongoose.Types.ObjectId().toString(),
      year: 2020,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product._id.toString()}&vehicleKey=${vehicleKey}`,
    );
    const body = (await res.json()) as Envelope<{ confidence: string | null }>;
    expect(body.data.confidence).toBeNull();
  });

  it("rejects a malformed vehicleKey with 400", async () => {
    const product = await seedProduct();
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product._id.toString()}&vehicleKey=not-a-key`,
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /fitment/products", () => {
  it("lists distinct products that fit the vehicle", async () => {
    const productA = await seedProduct();
    const productB = await seedProduct();
    const makeId = new mongoose.Types.ObjectId();
    const modelId = new mongoose.Types.ObjectId();

    await FitmentModel.create({
      productId: productA._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });
    await FitmentModel.create({
      productId: productB._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "likely",
    });

    const vehicleKey = buildVehicleKey({
      makeId: makeId.toString(),
      modelId: modelId.toString(),
      genId: new mongoose.Types.ObjectId().toString(),
      year: 2018,
    });
    const res = await fetch(`${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ id: string }[]>;
    expect(body.data.map((p) => p.id).sort()).toEqual(
      [productA._id.toString(), productB._id.toString()].sort(),
    );
  });

  it("filters by category slug", async () => {
    const product = await seedProduct();
    const makeId = new mongoose.Types.ObjectId();
    const modelId = new mongoose.Types.ObjectId();
    await FitmentModel.create({
      productId: product._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: makeId.toString(),
      modelId: modelId.toString(),
      genId: new mongoose.Types.ObjectId().toString(),
      year: 2018,
    });

    const category = await CategoryModel.findById(product.categoryId);
    const matching = await fetch(
      `${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}&category=${category!.slug}`,
    );
    const matchingBody = (await matching.json()) as Envelope<unknown[]>;
    expect(matchingBody.data).toHaveLength(1);

    const nonMatching = await fetch(
      `${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}&category=does-not-exist`,
    );
    const nonMatchingBody = (await nonMatching.json()) as Envelope<unknown[]>;
    expect(nonMatchingBody.data).toHaveLength(0);
  });

  it("returns an empty page when nothing fits", async () => {
    const vehicleKey = buildVehicleKey({
      makeId: new mongoose.Types.ObjectId().toString(),
      modelId: new mongoose.Types.ObjectId().toString(),
      genId: new mongoose.Types.ObjectId().toString(),
      year: 2018,
    });
    const res = await fetch(`${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toEqual([]);
    expect(body.meta).toEqual({ total: 0, page: 1, limit: 20 });
  });
});
