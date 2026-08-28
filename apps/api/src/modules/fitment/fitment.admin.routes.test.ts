import { randomUUID } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AdminFitmentDto } from "schemas";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct, seedVehicleTree } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";

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

async function seedTree(): Promise<void> {
  productId = (await seedProduct({ nameFa: "لنت ترمز", nameEn: "Brake pad" })).id;

  const branch = await seedVehicleTree({ engine: { code: "M13" } });
  makeId = branch.make.id;
  modelId = branch.model.id;
  genId = branch.gen.id;
  engineId = branch.engine.id;

  // A second, unrelated branch of the tree, for the cross-parent checks.
  const other = await seedVehicleTree({
    make: { nameFa: "ایران‌خودرو", nameEn: "IKCO" },
    model: { nameFa: "پژو ۴۰۵", nameEn: "Peugeot 405", bodyType: "sedan" },
    gen: { nameFa: "GLX", nameEn: "GLX", yearFrom: 2000, yearTo: null },
    engine: { code: "XU7", displacement: 1.8, power: 100 },
  });
  otherMakeId = other.make.id;
  otherModelId = other.model.id;
  otherGenId = other.gen.id;
}

beforeEach(async () => {
  await resetDb();
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
  // reporting an error anywhere. The foreign keys cannot catch this: every
  // id in it exists, they just do not belong together.
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
    const otherEngine = await prisma.vehicleEngine.create({
      data: {
        genId: otherGenId,
        code: "XU7-alt",
        displacement: 1.8,
        fuel: "petrol",
        power: 100,
      },
    });

    const res = await create({ genId, engineId: otherEngine.id });

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
  // clear the column, not leave the old value in place.
  it("clears the engine when an edit omits it", async () => {
    const created = await create({ genId, engineId });
    const { data } = (await created.json()) as { data: AdminFitmentDto };

    const res = await send(`/${data.id}`, "PATCH", validBody({ genId }));
    const updated = (await res.json()) as { data: AdminFitmentDto };

    expect(res.status).toBe(200);
    expect(updated.data.engineId).toBeUndefined();
    const stored = await prisma.fitment.findUnique({ where: { id: data.id } });
    expect(stored?.engineId).toBeNull();
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

  // The row pointing at a since-deleted generation is exactly what staff came
  // here to find; hiding its name would hide the problem. This is also the one
  // place the soft-delete extension's documented blind spot -- it does not
  // reach nested reads -- is the behaviour we want.
  it("still resolves a name for a soft-deleted reference", async () => {
    const created = await create({ genId });
    const { data } = (await created.json()) as { data: AdminFitmentDto };
    await prisma.vehicleGen.update({ where: { id: genId }, data: { deletedAt: new Date() } });

    const res = await send(`/${data.id}`, "GET");
    const body = (await res.json()) as { data: AdminFitmentDto };

    expect(body.data.genName).toBe("۱۳۱");
  });

  it("returns 404 for an unknown record id", async () => {
    const res = await send(`/${randomUUID()}`, "GET");
    expect(res.status).toBe(404);
  });
});
