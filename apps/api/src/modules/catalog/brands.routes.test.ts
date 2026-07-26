import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import { BrandModel } from "../../models/Brand.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-brands-routes");
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
  await Promise.all([BrandModel.deleteMany({}), AuditLogModel.deleteMany({})]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({ sub: new mongoose.Types.ObjectId().toString(), role });
  return { cookie: `accessToken=${token}` };
}

interface Envelope<T> {
  ok: boolean;
  data: T;
}

async function seedBrand() {
  return BrandModel.create({ name: { fa: "بوش", en: "Bosch" }, slug: "bosch", country: "Germany" });
}

describe("GET /catalog/brands", () => {
  it("lists brands with pagination meta", async () => {
    await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/catalog/brands`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /catalog/brands/:slug", () => {
  it("returns a brand by slug", async () => {
    await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/catalog/brands/bosch`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ country: string }>;
    expect(body.data.country).toBe("Germany");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/brands/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe("POST/PATCH/DELETE /admin/catalog/brands", () => {
  it("rejects a non-staff role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({ name: { fa: "x", en: "x" }, slug: "x", country: "Iran" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates a brand as staff and records an audit log entry", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: { fa: "والئو", en: "Valeo" },
        slug: "valeo",
        country: "France",
        isOEM: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ isOEM: boolean }>;
    expect(body.data.isOEM).toBe(true);

    const entries = await AuditLogModel.find({ entity: "brand" });
    expect(entries).toHaveLength(1);
  });

  it("updates a brand as staff", async () => {
    const brand = await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ description: "قطعات آلمانی با کیفیت" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ description: string }>;
    expect(body.data.description).toBe("قطعات آلمانی با کیفیت");
  });

  it("soft-deletes a brand as staff, hiding it from the public list", async () => {
    const brand = await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);

    const listRes = await fetch(`${baseUrl}/api/v1/catalog/brands`);
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toHaveLength(0);
  });
});
