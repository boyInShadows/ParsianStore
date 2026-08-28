import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedVehicles } from "../../seed/vehicles.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  await seedVehicles();
  ({ baseUrl, close } = await startTestServer());
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

async function saipaId(): Promise<string> {
  const saipa = await prisma.vehicleMake.findUnique({ where: { slug: "saipa" } });
  return saipa!.id;
}

async function tibaId(): Promise<string> {
  const tiba = await prisma.vehicleModel.findUnique({
    where: { makeId_slug: { makeId: await saipaId(), slug: "tiba" } },
  });
  return tiba!.id;
}

describe("GET /vehicles/makes", () => {
  it("returns both seeded makes with pagination meta", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/makes`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.meta).toEqual({ total: 2, page: 1, limit: 20 });
    expect(body.data.map((m) => m.slug).sort()).toEqual(["iran-khodro", "saipa"]);
  });

  it("does not leak row timestamps or the soft-delete column to the browser", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/makes?limit=1`);
    const body = (await res.json()) as Envelope<Record<string, unknown>[]>;
    expect(Object.keys(body.data[0]!)).not.toContain("deletedAt");
    expect(Object.keys(body.data[0]!)).not.toContain("createdAt");
  });

  it("respects page/limit", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/makes?page=1&limit=1`);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ total: 2, page: 1, limit: 1 });
  });

  it("clamps a limit over 100", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/makes?limit=500`);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.meta?.limit).toBe(100);
  });
});

describe("GET /vehicles/models", () => {
  it("filters by makeId", async () => {
    const makeId = await saipaId();
    const res = await fetch(`${baseUrl}/api/v1/vehicles/models?makeId=${makeId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ makeId: string }[]>;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((m) => m.makeId === makeId)).toBe(true);
  });

  it("rejects a malformed makeId", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/models?makeId=not-a-uuid`);
    expect(res.status).toBe(400);
  });
});

describe("GET /vehicles/generations", () => {
  it("filters by modelId", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/generations?modelId=${await tibaId()}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ yearFrom: number }[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.yearFrom).toBe(2009);
  });
});

describe("GET /vehicles/engines", () => {
  it("filters by genId", async () => {
    const gen = await prisma.vehicleGen.findFirst({ where: { modelId: await tibaId() } });
    const res = await fetch(`${baseUrl}/api/v1/vehicles/engines?genId=${gen!.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ code: string }[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.code).toBe("M15");
  });
});
