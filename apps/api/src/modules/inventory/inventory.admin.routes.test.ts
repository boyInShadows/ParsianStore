import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct as seedProductRow, seedUser } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

// An audit row points at its actor by foreign key now, so the signed token
// has to name a staff account that exists -- an invented subject would make
// the (fire-and-forget) audit write fail silently and hang the poll below.
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

// The audit entry is written fire-and-forget, so this polls rather than
// awaiting. The budget is generous on purpose: it costs nothing on the happy
// path (the loop returns the moment the entry lands, typically first tick),
// and 1000ms was tight enough to flake under a full suite sharing one
// database -- passing this file in isolation while failing in `pnpm test`.
async function waitForAuditEntry(entity: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await prisma.auditLog.count({ where: { entity } })) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No audit log entry for "${entity}" appeared within ${timeoutMs}ms`);
}

interface Envelope<T> {
  ok: boolean;
  data: T;
}

async function seedProduct(stock: number) {
  return seedProductRow({ stock, lowStockAt: 5 });
}

describe("POST /admin/inventory/adjust", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/inventory/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: randomUUID(),
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
    const moves = await prisma.inventoryMove.findMany({ where: { productId: product.id } });
    expect(moves).toHaveLength(1);
    expect(moves[0]!.byUserId).toBe(staffId);
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
