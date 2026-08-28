import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import { UserModel, type UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { AdminAuditLogDto } from "schemas";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await Promise.all([AuditLogModel.deleteMany({}), UserModel.deleteMany({})]);
});

afterAll(async () => {
  close();
  await disconnectDB();
});

function cookieFor(role: UserRole, sub = randomUUID()) {
  const token = signAccessToken({ sub, role, accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

async function seedEntry(overrides: {
  actorId: mongoose.Types.ObjectId;
  action?: string;
  entity?: string;
  entityId?: string;
  createdAt?: Date;
  before?: unknown;
  after?: unknown;
}) {
  const doc = await AuditLogModel.create({
    actorId: overrides.actorId,
    action: overrides.action ?? "PATCH /api/v1/admin/catalog/products/abc",
    entity: overrides.entity ?? "product",
    entityId: overrides.entityId,
    before: overrides.before,
    after: overrides.after,
    ip: "127.0.0.1",
  });
  if (overrides.createdAt) {
    // Raw driver: the timestamps plugin strips a caller-supplied createdAt
    // out of a Mongoose update, leaving the row dated "now".
    await AuditLogModel.collection.updateOne(
      { _id: doc._id },
      { $set: { createdAt: overrides.createdAt } },
    );
  }
  return doc;
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
    const actor = await UserModel.create({
      phone: "+989120000201",
      name: "مدیر سیستم",
      role: "admin",
    });
    await seedEntry({ actorId: actor._id });

    const { data } = await list();

    expect(data[0]?.actorName).toBe("مدیر سیستم");
    expect(data[0]?.actorPhone).toBe("+989120000201");
    expect(data[0]?.actorRole).toBe("admin");
  });

  // An audit trail that hides what a since-removed admin did defeats its
  // own purpose.
  it("still lists an entry whose actor no longer exists", async () => {
    await seedEntry({ actorId: randomUUID() });

    const { data } = await list();

    expect(data).toHaveLength(1);
    expect(data[0]?.actorName).toBeNull();
  });

  it("splits the stored action into method and path", async () => {
    await seedEntry({
      actorId: randomUUID(),
      action: "DELETE /api/v1/admin/catalog/brands/xyz",
    });

    const { data } = await list();

    expect(data[0]?.method).toBe("DELETE");
    expect(data[0]?.path).toBe("/api/v1/admin/catalog/brands/xyz");
  });

  it("does not produce an undefined path for a malformed action", async () => {
    await seedEntry({ actorId: randomUUID(), action: "LEGACY" });

    const { data } = await list();

    expect(data[0]?.method).toBe("");
    expect(data[0]?.path).toBe("LEGACY");
  });

  it("filters by entity", async () => {
    const actor = randomUUID();
    await seedEntry({ actorId: actor, entity: "product" });
    await seedEntry({ actorId: actor, entity: "coupon" });

    const { data } = await list("?entity=coupon");

    expect(data).toHaveLength(1);
    expect(data[0]?.entity).toBe("coupon");
  });

  it("filters by HTTP method without matching a method that merely contains it", async () => {
    const actor = randomUUID();
    await seedEntry({ actorId: actor, action: "POST /api/v1/admin/coupons" });
    await seedEntry({ actorId: actor, action: "DELETE /api/v1/admin/coupons/POST-like" });

    const { data } = await list("?method=POST");

    expect(data).toHaveLength(1);
    expect(data[0]?.method).toBe("POST");
  });

  it("filters by the entity id a route actually touched", async () => {
    const actor = randomUUID();
    await seedEntry({ actorId: actor, entityId: "aaa" });
    await seedEntry({ actorId: actor, entityId: "bbb" });

    const { data } = await list("?entityId=bbb");

    expect(data).toHaveLength(1);
    expect(data[0]?.entityId).toBe("bbb");
  });

  it("filters by a date window", async () => {
    const actor = randomUUID();
    await seedEntry({ actorId: actor, createdAt: new Date(Date.now() - 10 * DAY_MS) });
    await seedEntry({ actorId: actor });

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
    const actor = randomUUID();
    await seedEntry({ actorId: actor, entity: "old", createdAt: new Date(Date.now() - DAY_MS) });
    await seedEntry({ actorId: actor, entity: "new" });

    const { data } = await list();

    expect(data[0]?.entity).toBe("new");
  });

  it("passes through a service-recorded before/after pair", async () => {
    await seedEntry({
      actorId: randomUUID(),
      before: { stock: 5 },
      after: { stock: 3 },
    });

    const { data } = await list();

    expect(data[0]?.before).toEqual({ stock: 5 });
    expect(data[0]?.after).toEqual({ stock: 3 });
  });
});
