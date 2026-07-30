import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import { CategoryModel } from "../../models/Category.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-categories-routes");
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
  await Promise.all([CategoryModel.deleteMany({}), AuditLogModel.deleteMany({})]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

interface Envelope<T> {
  ok: boolean;
  data: T;
  error?: { message: string };
}

// auditLog() writes on res.on("finish"), after the response has already
// gone out — see middleware/auditLog.test.ts for why this polls instead
// of a fixed sleep (flaky under full-suite load with a fixed delay).
async function waitForAuditEntry(entity: string, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await AuditLogModel.countDocuments({ entity })) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No audit log entry for "${entity}" appeared within ${timeoutMs}ms`);
}

async function seedCategory(overrides: Record<string, unknown> = {}) {
  return CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: "brakes",
    systemCode: "SYS-04",
    ...overrides,
  });
}

describe("GET /catalog/categories", () => {
  it("lists categories and filters by parentId", async () => {
    const parent = await seedCategory();
    await CategoryModel.create({
      name: { fa: "لنت ترمز", en: "Brake pads" },
      slug: "brake-pads",
      parentId: parent._id,
      systemCode: "SYS-04",
      path: [parent.slug],
    });

    const all = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    const allBody = (await all.json()) as Envelope<{ slug: string }[]>;
    expect(allBody.data).toHaveLength(2);

    const filtered = await fetch(
      `${baseUrl}/api/v1/catalog/categories?parentId=${parent._id.toString()}`,
    );
    const filteredBody = (await filtered.json()) as Envelope<{ slug: string }[]>;
    expect(filteredBody.data).toHaveLength(1);
    expect(filteredBody.data[0]!.slug).toBe("brake-pads");
  });
});

describe("GET /catalog/categories/:slug", () => {
  it("returns a category by slug", async () => {
    await seedCategory();
    const res = await fetch(`${baseUrl}/api/v1/catalog/categories/brakes`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ name: { fa: string } }>;
    expect(body.data.name.fa).toBe("ترمز");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/categories/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe("POST/PATCH/DELETE /admin/catalog/categories", () => {
  it("rejects an unauthenticated write", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: { fa: "x", en: "x" },
        slug: "x",
        systemCode: "SYS-01",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({
        name: { fa: "x", en: "x" },
        slug: "x",
        systemCode: "SYS-01",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("creates a category as staff and records an audit log entry", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: { fa: "موتور", en: "Engine" },
        slug: "engine",
        systemCode: "SYS-01",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ slug: string }>;
    expect(body.data.slug).toBe("engine");

    await waitForAuditEntry("category");
    const entries = await AuditLogModel.find({ entity: "category" });
    expect(entries).toHaveLength(1);
  });

  it("rejects a systemCode outside the fixed taxonomy with 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ name: { fa: "x", en: "x" }, slug: "x", systemCode: "SYS-99" }),
    });
    expect(res.status).toBe(400);
  });

  it("computes path from the parent on create", async () => {
    const parent = await seedCategory();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: { fa: "لنت ترمز", en: "Brake pads" },
        slug: "brake-pads",
        parentId: parent._id.toString(),
        systemCode: "SYS-04",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ path: string[] }>;
    expect(body.data.path).toEqual(["brakes"]);
  });

  it("updates a category as staff", async () => {
    const category = await seedCategory();
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ order: 5 }),
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ order: number }>;
    expect(body.data.order).toBe(5);
  });

  it("soft-deletes a category as staff, hiding it from the public list", async () => {
    const category = await seedCategory();
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}`,
      {
        method: "DELETE",
        headers: staffCookie(),
      },
    );
    expect(res.status).toBe(200);

    const listRes = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toHaveLength(0);
  });
});
