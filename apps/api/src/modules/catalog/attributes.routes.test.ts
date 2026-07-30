import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { AttributeModel } from "../../models/Attribute.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-attributes-routes");
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
  await Promise.all([AttributeModel.deleteMany({}), AuditLogModel.deleteMany({})]);
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

describe("GET /admin/catalog/attributes", () => {
  it("rejects an unauthenticated request (no public attributes route exists)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`);
    expect(res.status).toBe(401);
  });

  it("lists attributes for staff", async () => {
    await AttributeModel.create({ name: "رنگ", key: "color", type: "select", options: ["قرمز"] });
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toHaveLength(1);
  });
});

describe("POST/PATCH/DELETE /admin/catalog/attributes", () => {
  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({ name: "رنگ", key: "color", type: "select" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates an attribute as staff and records an audit log entry", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: "رنگ",
        key: "color",
        type: "select",
        options: ["قرمز", "آبی"],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ key: string }>;
    expect(body.data.key).toBe("color");

    await waitForAuditEntry("attribute");
    const entries = await AuditLogModel.find({ entity: "attribute" });
    expect(entries).toHaveLength(1);
  });

  it("rejects a key that doesn't start with a lowercase letter", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ name: "x", key: "1bad", type: "text" }),
    });
    expect(res.status).toBe(400);
  });

  it("updates and soft-deletes an attribute as staff", async () => {
    const attribute = await AttributeModel.create({ name: "وزن", key: "weight", type: "number" });

    const updateRes = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ unit: "kg" }),
      },
    );
    expect(updateRes.status).toBe(200);
    const updateBody = (await updateRes.json()) as Envelope<{ unit: string }>;
    expect(updateBody.data.unit).toBe("kg");

    const deleteRes = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      { method: "DELETE", headers: staffCookie() },
    );
    expect(deleteRes.status).toBe(200);

    const listRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      headers: staffCookie(),
    });
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toHaveLength(0);
  });
});
