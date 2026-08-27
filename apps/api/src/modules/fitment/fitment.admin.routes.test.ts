import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../../config/testDb.js";
import { FitmentModel } from "../../models/Fitment.js";
import { ProductModel } from "../../models/Product.js";
import { VehicleEngineModel } from "../../models/VehicleEngine.js";
import { VehicleGenModel } from "../../models/VehicleGen.js";
import { VehicleMakeModel } from "../../models/VehicleMake.js";
import { VehicleModelModel } from "../../models/VehicleModel.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { AdminFitmentDto } from "schemas";

const BASE = "/api/v1/admin/fitment";
let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

afterAll(async () => {
  close();
  await disconnectDB();
});

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: randomUUID(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

async function send(path: string, method: string, body?: unknown) {
  return fetch(`${baseUrl}${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...staffCookie() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

let productId: string;
let makeId: string;
let modelId: string;
let genId: string;
let engineId: string;
let otherMakeId: string;
let otherModelId: string;
let otherGenId: string;

let skuCounter = 0;

async function seedTree(): Promise<void> {
  skuCounter += 1;
  const product = await ProductModel.create({
    name: { fa: "لنت ترمز", en: "Brake pad" },
    slug: `brake-pad-${skuCounter}`,
    sku: `BP-${skuCounter}`,
    brandId: randomUUID(),
    categoryId: randomUUID(),
    priceRial: 1_000_000,
    weightGram: 500,
    dimensions: { lengthMm: 10, widthMm: 10, heightMm: 10 },
    warranty: { months: 6, text: "شش ماه" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "SAIPA",
      countryOfManufacture: "ایران",
      verificationCode: `VC-${skuCounter}`,
    },
    status: "active",
  });
  productId = String(product._id);

  const make = await VehicleMakeModel.create({
    name: { fa: "سایپا", en: "Saipa" },
    slug: `saipa-${skuCounter}`,
    country: "ایران",
    isDomestic: true,
  });
  makeId = String(make._id);

  const model = await VehicleModelModel.create({
    makeId: make._id,
    name: { fa: "پراید", en: "Pride" },
    slug: `pride-${skuCounter}`,
    bodyType: "hatchback",
  });
  modelId = String(model._id);

  const generation = await VehicleGenModel.create({
    modelId: model._id,
    name: { fa: "۱۳۱", en: "131" },
    yearFrom: 2008,
    yearTo: 2018,
    facelift: false,
  });
  genId = String(generation._id);

  const engine = await VehicleEngineModel.create({
    genId: generation._id,
    code: "M13",
    displacement: 1.3,
    fuel: "petrol",
    power: 65,
  });
  engineId = String(engine._id);

  // A second, unrelated branch of the tree, for the cross-parent checks.
  const otherMake = await VehicleMakeModel.create({
    name: { fa: "ایران‌خودرو", en: "IKCO" },
    slug: `ikco-${skuCounter}`,
    country: "ایران",
    isDomestic: true,
  });
  otherMakeId = String(otherMake._id);

  const otherModel = await VehicleModelModel.create({
    makeId: otherMake._id,
    name: { fa: "پژو ۴۰۵", en: "Peugeot 405" },
    slug: `peugeot-405-${skuCounter}`,
    bodyType: "sedan",
  });
  otherModelId = String(otherModel._id);

  const otherGen = await VehicleGenModel.create({
    modelId: otherModel._id,
    name: { fa: "GLX", en: "GLX" },
    yearFrom: 2000,
    yearTo: null,
    facelift: false,
  });
  otherGenId = String(otherGen._id);
}

beforeEach(async () => {
  await Promise.all([
    FitmentModel.deleteMany({}),
    ProductModel.deleteMany({}),
    VehicleMakeModel.deleteMany({}),
    VehicleModelModel.deleteMany({}),
    VehicleGenModel.deleteMany({}),
    VehicleEngineModel.deleteMany({}),
  ]);
  await seedTree();
});

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    productId,
    makeId,
    modelId,
    yearFrom: 2010,
    yearTo: 2015,
    confidence: "exact",
    ...overrides,
  };
}

async function create(overrides: Record<string, unknown> = {}) {
  return send("", "POST", validBody(overrides));
}

describe("admin fitment routes", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await fetch(`${baseUrl}${BASE}`);
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in customer", async () => {
    const res = await fetch(`${baseUrl}${BASE}`, { headers: staffCookie("customer") });
    expect(res.status).toBe(403);
  });

  it("creates a record and resolves every referenced name", async () => {
    const res = await create({ genId, engineId });
    const body = (await res.json()) as { data: AdminFitmentDto };

    expect(res.status).toBe(201);
    expect(body.data.productName).toBe("لنت ترمز");
    expect(body.data.makeName).toBe("سایپا");
    expect(body.data.modelName).toBe("پراید");
    expect(body.data.genName).toBe("۱۳۱");
    expect(body.data.engineCode).toBe("M13");
  });

  it("accepts a model-wide record with no generation", async () => {
    const res = await create();
    const body = (await res.json()) as { data: AdminFitmentDto };

    expect(res.status).toBe(201);
    expect(body.data.genId).toBeUndefined();
  });

  // An engine belongs to a generation; without one, the matcher would
  // treat the record as applying to every generation, which is not what
  // whoever picked the engine meant.
  it("refuses an engine-scoped record with no generation", async () => {
    const res = await create({ engineId });
    expect(res.status).toBe(400);
  });

  // A record naming a Pride generation under Iran Khodro would simply
  // never match -- the part would quietly fit no car, with nothing
  // reporting an error anywhere.
  it("refuses a model that is not under the chosen make", async () => {
    const res = await create({ makeId, modelId: otherModelId });
    expect(res.status).toBe(400);
  });

  it("accepts the same model under the make it actually belongs to", async () => {
    const res = await create({ makeId: otherMakeId, modelId: otherModelId });
    expect(res.status).toBe(201);
  });

  it("refuses a generation that is not under the chosen model", async () => {
    const res = await create({ genId: otherGenId });
    expect(res.status).toBe(400);
  });

  it("refuses an engine that is not under the chosen generation", async () => {
    const otherEngine = await VehicleEngineModel.create({
      genId: otherGenId,
      code: "XU7",
      displacement: 1.8,
      fuel: "petrol",
      power: 100,
    });

    const res = await create({ genId, engineId: String(otherEngine._id) });

    expect(res.status).toBe(400);
  });

  it("refuses a product that does not exist", async () => {
    const res = await create({ productId: randomUUID() });
    expect(res.status).toBe(400);
  });

  it("refuses an end year before the start year", async () => {
    const res = await create({ yearFrom: 2015, yearTo: 2010 });
    expect(res.status).toBe(400);
  });

  it("accepts an open-ended record still in production", async () => {
    const res = await create({ yearTo: null });
    const body = (await res.json()) as { data: AdminFitmentDto };

    expect(res.status).toBe(201);
    expect(body.data.yearTo).toBeNull();
  });

  it("refuses a confidence outside the enum", async () => {
    const res = await create({ confidence: "maybe" });
    expect(res.status).toBe(400);
  });

  // Broadening a record from one engine to all engines has to actually
  // clear the field, not leave the old value in place.
  it("clears the engine when an edit omits it", async () => {
    const created = await create({ genId, engineId });
    const { data } = (await created.json()) as { data: AdminFitmentDto };

    const res = await send(`/${data.id}`, "PATCH", validBody({ genId }));
    const updated = (await res.json()) as { data: AdminFitmentDto };

    expect(res.status).toBe(200);
    expect(updated.data.engineId).toBeUndefined();
    const stored = await FitmentModel.findById(data.id);
    expect(stored?.engineId).toBeUndefined();
  });

  it("filters by product and by confidence", async () => {
    await create({ confidence: "exact" });
    await create({ genId, confidence: "check" });

    const byConfidence = await send("?confidence=check", "GET");
    const body = (await byConfidence.json()) as { data: AdminFitmentDto[] };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.confidence).toBe("check");
  });

  it("soft-deletes and restores a record", async () => {
    const created = await create();
    const { data } = (await created.json()) as { data: AdminFitmentDto };

    expect((await send(`/${data.id}`, "DELETE")).status).toBe(200);
    const afterDelete = (await (await send("", "GET")).json()) as {
      data: AdminFitmentDto[];
      meta: { total: number };
    };
    expect(afterDelete.data).toHaveLength(0);
    expect(afterDelete.meta.total).toBe(0);

    expect((await send(`/${data.id}/restore`, "POST")).status).toBe(200);
    const afterRestore = (await (await send("", "GET")).json()) as { data: AdminFitmentDto[] };
    expect(afterRestore.data).toHaveLength(1);
  });

  // The row pointing at a since-deleted generation is exactly what staff
  // came here to find; hiding its name would hide the problem.
  it("still resolves a name for a soft-deleted reference", async () => {
    const created = await create({ genId });
    const { data } = (await created.json()) as { data: AdminFitmentDto };
    const generation = await VehicleGenModel.findById(genId);
    await generation?.softDelete();

    const res = await send(`/${data.id}`, "GET");
    const body = (await res.json()) as { data: AdminFitmentDto };

    expect(body.data.genName).toBe("۱۳۱");
  });

  it("returns 404 for an unknown record id", async () => {
    const res = await send(`/${randomUUID()}`, "GET");
    expect(res.status).toBe(404);
  });
});
