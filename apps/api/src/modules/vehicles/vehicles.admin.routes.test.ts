import type { Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct, seedUser } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";
import type {
  AdminVehicleEngineDto,
  AdminVehicleGenDto,
  AdminVehicleMakeDto,
  AdminVehicleModelDto,
} from "schemas";

const BASE = "/api/v1/admin/vehicles";
let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

// An audit row points at its actor by foreign key now, so the signed token
// has to name a staff account that exists -- otherwise the (fire-and-forget)
// audit write fails silently and every wait-for-audit assertion hangs.
let staffId: string;

beforeEach(async () => {
  await resetDb();
  staffId = (await seedUser({ role: "admin" })).id;
});

afterAll(async () => {
  close();
  await disconnectDB();
});

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({ sub: staffId, role, accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

async function send(path: string, method: string, body?: unknown) {
  return fetch(`${baseUrl}${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...staffCookie() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function json<T>(res: Response): Promise<T> {
  const parsed = (await res.json()) as { data: T };
  return parsed.data;
}

const MAKE = {
  name: { fa: "سایپا", en: "Saipa" },
  slug: "saipa",
  country: "ایران",
  isDomestic: true,
};

async function seedMake(overrides: Record<string, unknown> = {}) {
  const res = await send("/makes", "POST", { ...MAKE, ...overrides });
  return json<AdminVehicleMakeDto>(res);
}

async function seedModel(makeId: string, overrides: Record<string, unknown> = {}) {
  const res = await send("/models", "POST", {
    makeId,
    name: { fa: "پراید", en: "Pride" },
    slug: "pride",
    bodyType: "hatchback",
    ...overrides,
  });
  return json<AdminVehicleModelDto>(res);
}

async function seedGeneration(modelId: string, overrides: Record<string, unknown> = {}) {
  const res = await send("/generations", "POST", {
    modelId,
    name: { fa: "۱۳۱", en: "131" },
    yearFrom: 2008,
    yearTo: 2018,
    ...overrides,
  });
  return json<AdminVehicleGenDto>(res);
}

async function seedEngine(genId: string, overrides: Record<string, unknown> = {}) {
  const res = await send("/engines", "POST", {
    genId,
    code: "M13",
    displacement: 1.3,
    fuel: "petrol",
    power: 65,
    ...overrides,
  });
  return json<AdminVehicleEngineDto>(res);
}

/** A fitment referencing a real product: `productId` is a foreign key now,
 * where the Mongo fixture invented one. These records exist here only to
 * exercise the vehicle-tree delete guards. */
async function seedFitment(refs: Record<string, unknown>) {
  const product = await seedProduct();
  return prisma.fitment.create({
    data: {
      productId: product.id,
      yearFrom: 2010,
      yearTo: 2015,
      confidence: "exact",
      ...refs,
    } as Prisma.FitmentUncheckedCreateInput,
  });
}

describe("admin vehicle routes", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await fetch(`${baseUrl}${BASE}/makes`);
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in customer", async () => {
    const res = await fetch(`${baseUrl}${BASE}/makes`, { headers: staffCookie("customer") });
    expect(res.status).toBe(403);
  });

  it("creates a make and reports zero usage", async () => {
    const make = await seedMake();

    expect(make.name.fa).toBe("سایپا");
    expect(make.modelCount).toBe(0);
    expect(make.fitmentCount).toBe(0);
  });

  it("rejects a slug with characters outside the allowed set", async () => {
    const res = await send("/makes", "POST", { ...MAKE, slug: "سایپا" });
    expect(res.status).toBe(400);
  });

  it("counts a make's models", async () => {
    const make = await seedMake();
    await seedModel(make.id);

    const res = await send("/makes", "GET");
    const rows = await json<AdminVehicleMakeDto[]>(res);

    expect(rows[0]?.modelCount).toBe(1);
  });

  it("refuses to create a model under a make that does not exist", async () => {
    const res = await send("/models", "POST", {
      makeId: randomUUID(),
      nameFa: "پراید",
      nameEn: "Pride",
      slug: "pride",
      bodyType: "hatchback",
    });
    expect(res.status).toBe(400);
  });

  it("filters models by make", async () => {
    const saipa = await seedMake();
    const ikco = await seedMake({ slug: "ikco", nameFa: "ایران‌خودرو", nameEn: "IKCO" });
    await seedModel(saipa.id);
    await seedModel(ikco.id, { slug: "peugeot-405", nameFa: "پژو ۴۰۵", nameEn: "Peugeot 405" });

    const res = await send(`/models?makeId=${ikco.id}`, "GET");
    const rows = await json<AdminVehicleModelDto[]>(res);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe("peugeot-405");
  });

  // Deleting a make with models under it would orphan every one of them.
  it("refuses to delete a make that still has models", async () => {
    const make = await seedMake();
    await seedModel(make.id);

    const res = await send(`/makes/${make.id}`, "DELETE");

    expect(res.status).toBe(409);
  });

  // Deleting a make a fitment still references leaves that record matching
  // nothing, which reads on the storefront as "this part fits no car" rather
  // than as an error -- so the service refuses. (The database would refuse
  // too, now that the reference is a Restrict foreign key, but with a
  // constraint violation instead of a 409 and a Persian message.)
  it("refuses to delete a make still referenced by a fitment record", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);
    await seedFitment({ makeId: make.id, modelId: model.id });

    const res = await send(`/makes/${make.id}`, "DELETE");

    expect(res.status).toBe(409);
  });

  it("deletes and restores a make with nothing referencing it", async () => {
    const make = await seedMake();

    expect((await send(`/makes/${make.id}`, "DELETE")).status).toBe(200);
    const listed = await json<AdminVehicleMakeDto[]>(await send("/makes", "GET"));
    expect(listed).toHaveLength(0);

    expect((await send(`/makes/${make.id}/restore`, "POST")).status).toBe(200);
    const restored = await json<AdminVehicleMakeDto[]>(await send("/makes", "GET"));
    expect(restored).toHaveLength(1);
  });

  it("refuses to delete a model that still has generations", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);
    await seedGeneration(model.id);

    const res = await send(`/models/${model.id}`, "DELETE");

    expect(res.status).toBe(409);
  });

  it("refuses to delete a generation that still has engines", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);
    const generation = await seedGeneration(model.id);
    await seedEngine(generation.id);

    const res = await send(`/generations/${generation.id}`, "DELETE");

    expect(res.status).toBe(409);
  });

  it("refuses to delete an engine still referenced by a fitment record", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);
    const generation = await seedGeneration(model.id);
    const engine = await seedEngine(generation.id);
    await seedFitment({
      makeId: make.id,
      modelId: model.id,
      genId: generation.id,
      engineId: engine.id,
    });

    const res = await send(`/engines/${engine.id}`, "DELETE");

    expect(res.status).toBe(409);
  });

  it("accepts an open-ended generation still in production", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);

    const generation = await seedGeneration(model.id, { yearTo: null });

    expect(generation.yearTo).toBeNull();
  });

  it("refuses a generation whose end year precedes its start", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);

    const res = await send("/generations", "POST", {
      modelId: model.id,
      nameFa: "۱۳۱",
      nameEn: "131",
      yearFrom: 2015,
      yearTo: 2008,
    });

    expect(res.status).toBe(400);
  });

  // A Jalali year typed into a Gregorian field is the likeliest data-entry
  // mistake here, and it would silently make every fitment check fail.
  it("refuses a Jalali year in a Gregorian field", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);

    const res = await send("/generations", "POST", {
      modelId: model.id,
      nameFa: "۱۳۱",
      nameEn: "131",
      yearFrom: 1404,
      yearTo: null,
    });

    expect(res.status).toBe(400);
  });

  it("refuses an engine with a non-positive displacement", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);
    const generation = await seedGeneration(model.id);

    const res = await send("/engines", "POST", {
      genId: generation.id,
      code: "M13",
      displacement: 0,
      fuel: "petrol",
      power: 65,
    });

    expect(res.status).toBe(400);
  });

  it("refuses a fuel type outside the enum", async () => {
    const make = await seedMake();
    const model = await seedModel(make.id);
    const generation = await seedGeneration(model.id);

    const res = await send("/engines", "POST", {
      genId: generation.id,
      code: "M13",
      displacement: 1.3,
      fuel: "diesel",
      power: 65,
    });

    expect(res.status).toBe(400);
  });

  it("updates a make in place", async () => {
    const make = await seedMake();

    const res = await send(`/makes/${make.id}`, "PATCH", { country: "کره جنوبی" });
    const updated = await json<AdminVehicleMakeDto>(res);

    expect(res.status).toBe(200);
    expect(updated.country).toBe("کره جنوبی");
  });

  it("returns 404 for an unknown make id", async () => {
    const res = await send(`/makes/${randomUUID()}`, "PATCH", {
      country: "ایران",
    });
    expect(res.status).toBe(404);
  });
});
