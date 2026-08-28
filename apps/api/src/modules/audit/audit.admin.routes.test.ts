import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedUser } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { AdminAuditLogDto } from "schemas";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

// Every entry needs a real actor: `actorId` is a foreign key now, where a
// Mongo document could name any id at all. One staff row per test, reused.
let actorId: string;

beforeEach(async () => {
  await resetDb();
  actorId = (await seedUser({ role: "admin", name: "مدیر" })).id;
});

afterAll(async () => {
  close();
  await disconnectDB();
});

function cookieFor(role: UserRole, sub = randomUUID()) {
  const token = signAccessToken({ sub, role, accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

async function seedEntry(
  overrides: {
    actorId?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    createdAt?: Date;
    before?: unknown;
    after?: unknown;
  } = {},
) {
  return prisma.auditLog.create({
    data: {
      actorId: overrides.actorId ?? actorId,
      action: overrides.action ?? "PATCH /api/v1/admin/catalog/products/abc",
      entity: overrides.entity ?? "product",
      entityId: overrides.entityId ?? null,
      ...(overrides.before === undefined ? {} : { before: overrides.before as object }),
      ...(overrides.after === undefined ? {} : { after: overrides.after as object }),
      ip: "127.0.0.1",
      // A plain column, so a fixture can simply state when this happened.
      // Mongoose needed the raw driver here: its timestamps plugin stripped
      // a caller-supplied `createdAt` out of an update.
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

async function list(query = ""): Promise<{ status: number; data: AdminAuditLogDto[] }> {
  const res = await fetch(`${baseUrl}/api/v1/admin/audit${query}`, { headers: cookieFor("admin") });
  const json = (await res.json()) as { data: AdminAuditLogDto[] };
  return { status: res.status, data: json.data };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("admin audit routes", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/audit`);
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in customer", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/audit`, { headers: cookieFor("customer") });
    expect(res.status).toBe(403);
  });

  // The trail exists to hold staff accountable, so a support/operator
  // account must not be able to read (or vet) it.
  it.each<UserRole>(["support", "operator"])("rejects a %s account", async (role) => {
    const res = await fetch(`${baseUrl}/api/v1/admin/audit`, { headers: cookieFor(role) });
    expect(res.status).toBe(403);
  });

  it.each<UserRole>(["admin", "superadmin"])("allows a %s account", async (role) => {
    const res = await fetch(`${baseUrl}/api/v1/admin/audit`, { headers: cookieFor(role) });
    expect(res.status).toBe(200);
  });

  it("resolves the actor's name, phone and role", async () => {
    const actor = await seedUser({
      phone: "+989120000201",
      name: "مدیر سیستم",
      role: "admin",
    });
    await seedEntry({ actorId: actor.id });

    const { data } = await list();

    expect(data[0]?.actorName).toBe("مدیر سیستم");
    expect(data[0]?.actorPhone).toBe("+989120000201");
    expect(data[0]?.actorRole).toBe("admin");
  });

  // An audit trail that hides what a since-removed admin did defeats its own
  // purpose. "No longer exists" means soft-deleted now -- the foreign key
  // makes a dangling actorId unstorable, and admin CRUD never hard-deletes a
  // staff account anyway.
  it("still lists an entry whose actor no longer exists", async () => {
    await seedEntry();
    await prisma.user.update({ where: { id: actorId }, data: { deletedAt: new Date() } });

    const { data } = await list();

    expect(data).toHaveLength(1);
    expect(data[0]?.actorName).toBeNull();
  });

  it("splits the stored action into method and path", async () => {
    await seedEntry({
      action: "DELETE /api/v1/admin/catalog/brands/xyz",
    });

    const { data } = await list();

    expect(data[0]?.method).toBe("DELETE");
    expect(data[0]?.path).toBe("/api/v1/admin/catalog/brands/xyz");
  });

  it("does not produce an undefined path for a malformed action", async () => {
    await seedEntry({ action: "LEGACY" });

    const { data } = await list();

    expect(data[0]?.method).toBe("");
    expect(data[0]?.path).toBe("LEGACY");
  });

  it("filters by entity", async () => {
    await seedEntry({ entity: "product" });
    await seedEntry({ entity: "coupon" });

    const { data } = await list("?entity=coupon");

    expect(data).toHaveLength(1);
    expect(data[0]?.entity).toBe("coupon");
  });

  it("filters by HTTP method without matching a method that merely contains it", async () => {
    await seedEntry({ action: "POST /api/v1/admin/coupons" });
    await seedEntry({ action: "DELETE /api/v1/admin/coupons/POST-like" });

    const { data } = await list("?method=POST");

    expect(data).toHaveLength(1);
    expect(data[0]?.method).toBe("POST");
  });

  it("filters by the entity id a route actually touched", async () => {
    await seedEntry({ entityId: "aaa" });
    await seedEntry({ entityId: "bbb" });

    const { data } = await list("?entityId=bbb");

    expect(data).toHaveLength(1);
    expect(data[0]?.entityId).toBe("bbb");
  });

  it("filters by a date window", async () => {
    await seedEntry({ createdAt: new Date(Date.now() - 10 * DAY_MS) });
    await seedEntry();

    const from = new Date(Date.now() - 2 * DAY_MS).toISOString();
    const { data } = await list(`?from=${encodeURIComponent(from)}`);

    expect(data).toHaveLength(1);
  });

  it("rejects a non-ISO date filter", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/audit?from=1404-05-08`, {
      headers: cookieFor("admin"),
    });
    expect(res.status).toBe(400);
  });

  it("returns newest first", async () => {
    await seedEntry({ entity: "old", createdAt: new Date(Date.now() - DAY_MS) });
    await seedEntry({ entity: "new" });

    const { data } = await list();

    expect(data[0]?.entity).toBe("new");
  });

  it("passes through a service-recorded before/after pair", async () => {
    await seedEntry({
      before: { stock: 5 },
      after: { stock: 3 },
    });

    const { data } = await list();

    expect(data[0]?.before).toEqual({ stock: 5 });
    expect(data[0]?.after).toEqual({ stock: 3 });
  });
});
