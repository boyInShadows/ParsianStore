import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { VehicleGenModel } from "../../models/VehicleGen.js";
import { VehicleMakeModel } from "../../models/VehicleMake.js";
import { VehicleModelModel } from "../../models/VehicleModel.js";
import { seedVehicles } from "../../seed/vehicles.js";

const TEST_URI = testDbUri("parsian-store-test-vehicles-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await seedVehicles();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
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

describe("GET /vehicles/makes", () => {
  it("returns both seeded makes with pagination meta", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/makes`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.meta).toEqual({ total: 2, page: 1, limit: 20 });
    expect(body.data.map((m) => m.slug).sort()).toEqual(["iran-khodro", "saipa"]);
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
    const saipa = await VehicleMakeModel.findOne({ slug: "saipa" });
    const res = await fetch(`${baseUrl}/api/v1/vehicles/models?makeId=${saipa!._id.toString()}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ makeId: string }[]>;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((m) => m.makeId === saipa!._id.toString())).toBe(true);
  });

  it("rejects a malformed makeId", async () => {
    const res = await fetch(`${baseUrl}/api/v1/vehicles/models?makeId=not-an-object-id`);
    expect(res.status).toBe(400);
  });
});

describe("GET /vehicles/generations", () => {
  it("filters by modelId", async () => {
    const saipa = await VehicleMakeModel.findOne({ slug: "saipa" });
    const tiba = await VehicleModelModel.findOne({ makeId: saipa!._id, slug: "tiba" });
    const res = await fetch(
      `${baseUrl}/api/v1/vehicles/generations?modelId=${tiba!._id.toString()}`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ yearFrom: number }[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.yearFrom).toBe(2009);
  });
});

describe("GET /vehicles/engines", () => {
  it("filters by genId", async () => {
    const saipa = await VehicleMakeModel.findOne({ slug: "saipa" });
    const tiba = await VehicleModelModel.findOne({ makeId: saipa!._id, slug: "tiba" });
    const gen = await VehicleGenModel.findOne({ modelId: tiba!._id });
    const res = await fetch(`${baseUrl}/api/v1/vehicles/engines?genId=${gen!._id.toString()}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ code: string }[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.code).toBe("M15");
  });
});
