import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import { InventoryMoveModel } from "../../models/InventoryMove.js";
import { ProductModel } from "../../models/Product.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-inventory-admin-routes");
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
  await Promise.all([
    ProductModel.deleteMany({}),
    InventoryMoveModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
  ]);
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

// The audit entry is written fire-and-forget, so this polls rather than
// awaiting. The budget is generous on purpose: it costs nothing on the happy
// path (the loop returns the moment the entry lands, typically first tick),
// and 1000ms was tight enough to flake under a full parallel suite sharing
// one MongoDB -- passing this file in isolation while failing in `pnpm test`.
async function waitForAuditEntry(entity: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await AuditLogModel.countDocuments({ entity })) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No audit log entry for "${entity}" appeared within ${timeoutMs}ms`);
}

interface Envelope<T> {
  ok: boolean;
  data: T;
}

async function seedProduct(stock: number) {
  return ProductModel.create({
    name: { fa: "لنت ترمز", en: "Brake pad" },
    slug: "brake-pad",
    sku: "SKU-INV-1",
    brandId: new mongoose.Types.ObjectId(),
    categoryId: new mongoose.Types.ObjectId(),
    priceRial: 1_000_000,
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه" },
    status: "active",
    stock,
    lowStockAt: 5,
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: "VER-INV-1",
    },
  });
}

describe("POST /admin/inventory/adjust", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/inventory/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: new mongoose.Types.ObjectId().toString(),
        delta: 1,
        reason: "restock",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const product = await seedProduct(10);
    const res = await fetch(`${baseUrl}/api/v1/admin/inventory/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({ productId: product.id, delta: 1, reason: "restock" }),
    });
    expect(res.status).toBe(403);
  });

  it("adjusts stock as staff and records an audit log entry with the actor", async () => {
    const product = await seedProduct(10);
    const res = await fetch(`${baseUrl}/api/v1/admin/inventory/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ productId: product.id, delta: 5, reason: "restock" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ stock: number }>;
    expect(body.data.stock).toBe(15);

    await waitForAuditEntry("inventory");
    const moves = await InventoryMoveModel.find({ productId: product._id });
    expect(moves).toHaveLength(1);
    expect(moves[0]!.byUserId).toBeDefined();
    // Explicit timeout above waitForAuditEntry's poll budget: without it the
    // 5s default fires first and reports a bare "Test timed out" instead of
    // the helper's message naming the audit entity that never arrived.
  }, 15_000);

  it("rejects a system-internal reason like 'reservation'", async () => {
    const product = await seedProduct(10);
    const res = await fetch(`${baseUrl}/api/v1/admin/inventory/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ productId: product.id, delta: -1, reason: "reservation" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 409 when the decrement would oversell", async () => {
    const product = await seedProduct(2);
    const res = await fetch(`${baseUrl}/api/v1/admin/inventory/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ productId: product.id, delta: -5, reason: "manual-adjustment" }),
    });
    expect(res.status).toBe(409);
  });
});

describe("GET /admin/inventory/low-stock", () => {
  it("lists products at or below their lowStockAt threshold", async () => {
    await seedProduct(3);
    const res = await fetch(`${baseUrl}/api/v1/admin/inventory/low-stock`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ stock: number }[]>;
    expect(body.data).toHaveLength(1);
  });
});
