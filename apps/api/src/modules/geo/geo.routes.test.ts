import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { ProvinceModel } from "../../models/Province.js";
import { seedGeo } from "../../seed/geo.js";

const TEST_URI = testDbUri("parsian-store-test-geo-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await seedGeo();

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

describe("GET /geo/provinces", () => {
  it("returns all 31 provinces, paginated", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/provinces?limit=100`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.meta).toEqual({ total: 31, page: 1, limit: 100 });
    expect(body.data.map((p) => p.slug)).toContain("tehran");
  });

  it("clamps a limit over 100", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/provinces?limit=500`);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.meta?.limit).toBe(100);
  });
});

describe("GET /geo/cities", () => {
  it("filters by provinceId", async () => {
    const tehran = await ProvinceModel.findOne({ slug: "tehran" });
    const res = await fetch(`${baseUrl}/api/v1/geo/cities?provinceId=${tehran!._id.toString()}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ provinceId: string }[]>;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((c) => c.provinceId === tehran!._id.toString())).toBe(true);
  });

  it("rejects a malformed provinceId", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/cities?provinceId=not-an-object-id`);
    expect(res.status).toBe(400);
  });

  it("returns every seeded city when no provinceId is given", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/cities?limit=100`);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.meta?.total).toBeGreaterThan(31);
  });
});
