import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildVehicleKey } from "schemas";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedCategory, seedProduct, seedVehicleTree } from "../../test/factories.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

// Truncating every table beats a `deleteMany` per model: the tables are a
// foreign-key graph now, so deleting them one at a time has to be done in
// dependency order or it fails on a constraint.
beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  close();
  await disconnectDB();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

/**
 * Under Mongo these fixtures pointed at invented `ObjectId`s -- a fitment
 * naming a make that did not exist was perfectly storable. A foreign key
 * refuses that, so every test builds a real vehicle branch first. This is the
 * single biggest change to the suite, and it is the database enforcing
 * something the application always assumed.
 */
async function seedFitment(
  productId: string,
  data: {
    makeId: string;
    modelId: string;
    genId?: string | null;
    engineId?: string | null;
    yearFrom: number;
    yearTo?: number | null;
    confidence: "exact" | "likely" | "check";
    note?: string;
  },
) {
  return prisma.fitment.create({
    data: {
      productId,
      makeId: data.makeId,
      modelId: data.modelId,
      genId: data.genId ?? null,
      engineId: data.engineId ?? null,
      yearFrom: data.yearFrom,
      yearTo: data.yearTo ?? null,
      confidence: data.confidence,
      ...(data.note ? { note: data.note } : {}),
    },
  });
}

describe("GET /fitment/check", () => {
  it("returns confidence: null when no fitment record exists", async () => {
    const product = await seedProduct();
    const { make, model, gen } = await seedVehicleTree();
    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2020,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product.id}&vehicleKey=${vehicleKey}`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ confidence: string | null }>;
    expect(body.data.confidence).toBeNull();
  });

  it("matches a make/model-only record across any generation and year within range", async () => {
    const product = await seedProduct();
    const { make, model, gen } = await seedVehicleTree();
    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2010,
      yearTo: null,
      confidence: "likely",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2018,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product.id}&vehicleKey=${vehicleKey}`,
    );
    const body = (await res.json()) as Envelope<{ confidence: string; note?: string }>;
    expect(body.data.confidence).toBe("likely");
  });

  it("prefers the most specific matching record", async () => {
    const product = await seedProduct();
    const { make, model, gen, engine } = await seedVehicleTree();

    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2000,
      yearTo: null,
      confidence: "check",
    });
    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      engineId: engine.id,
      yearFrom: 2000,
      yearTo: null,
      confidence: "exact",
      note: "برای موتور M13",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      engineId: engine.id,
      year: 2012,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product.id}&vehicleKey=${vehicleKey}`,
    );
    const body = (await res.json()) as Envelope<{ confidence: string; note?: string }>;
    expect(body.data.confidence).toBe("exact");
    expect(body.data.note).toBe("برای موتور M13");
  });

  // An engine-specific record cannot match a vehicle that names no engine.
  it("ignores an engine-scoped record when the vehicle names no engine", async () => {
    const product = await seedProduct();
    const { make, model, gen, engine } = await seedVehicleTree();
    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      engineId: engine.id,
      yearFrom: 2000,
      yearTo: null,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2012,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product.id}&vehicleKey=${vehicleKey}`,
    );
    const body = (await res.json()) as Envelope<{ confidence: string | null }>;
    expect(body.data.confidence).toBeNull();
  });

  it("does not match when the vehicle year is outside [yearFrom, yearTo]", async () => {
    const product = await seedProduct();
    const { make, model, gen } = await seedVehicleTree();
    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2010,
      yearTo: 2015,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2020,
    });
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product.id}&vehicleKey=${vehicleKey}`,
    );
    const body = (await res.json()) as Envelope<{ confidence: string | null }>;
    expect(body.data.confidence).toBeNull();
  });

  it("rejects a malformed vehicleKey with 400", async () => {
    const product = await seedProduct();
    const res = await fetch(
      `${baseUrl}/api/v1/fitment/check?productId=${product.id}&vehicleKey=not-a-key`,
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /fitment/products", () => {
  it("lists distinct products that fit the vehicle", async () => {
    const productA = await seedProduct();
    const productB = await seedProduct();
    const { make, model, gen } = await seedVehicleTree();

    await seedFitment(productA.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });
    await seedFitment(productB.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2010,
      yearTo: null,
      confidence: "likely",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2018,
    });
    const res = await fetch(`${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ id: string }[]>;
    expect(body.data.map((p) => p.id).sort()).toEqual([productA.id, productB.id].sort());
  });

  // The wholesale price is a column like any other now, where Mongoose kept it
  // out of query results with `select: false`. Nothing but the DTO mapper stops
  // it reaching the wire, so this asserts it does.
  it("never emits the wholesale price", async () => {
    const product = await seedProduct({ wholesalePriceRial: 900_000 });
    const { make, model, gen } = await seedVehicleTree();
    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2018,
    });
    const res = await fetch(`${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}`);
    const body = (await res.json()) as Envelope<Record<string, unknown>[]>;
    expect(body.data[0]).not.toHaveProperty("wholesalePriceRial");
    expect(body.data[0]?.priceRial).toBe(1_500_000);
  });

  it("filters by category slug", async () => {
    const category = await seedCategory();
    const product = await seedProduct({ categoryId: category.id });
    const { make, model, gen } = await seedVehicleTree();
    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2018,
    });

    const matching = await fetch(
      `${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}&category=${category.slug}`,
    );
    const matchingBody = (await matching.json()) as Envelope<unknown[]>;
    expect(matchingBody.data).toHaveLength(1);

    const nonMatching = await fetch(
      `${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}&category=does-not-exist`,
    );
    const nonMatchingBody = (await nonMatching.json()) as Envelope<unknown[]>;
    expect(nonMatchingBody.data).toHaveLength(0);
  });

  // New under Postgres, and deliberate: a draft part used to be listed as
  // fitting and then 404 on its own page. See listFittingProducts.
  it("omits a product that is not active", async () => {
    const product = await seedProduct({ status: "draft" });
    const { make, model, gen } = await seedVehicleTree();
    await seedFitment(product.id, {
      makeId: make.id,
      modelId: model.id,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2018,
    });
    const res = await fetch(`${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}`);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toEqual([]);
  });

  it("returns an empty page when nothing fits", async () => {
    const { make, model, gen } = await seedVehicleTree();
    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
      year: 2018,
    });
    const res = await fetch(`${baseUrl}/api/v1/fitment/products?vehicleKey=${vehicleKey}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toEqual([]);
    expect(body.meta).toEqual({ total: 0, page: 1, limit: 20 });
  });
});
