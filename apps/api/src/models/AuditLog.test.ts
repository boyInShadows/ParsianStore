import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { AuditLogModel } from "./AuditLog.js";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("AuditLogModel", () => {
  it("stores actor/action/entity/entityId/ip and timestamps", async () => {
    const actorId = randomUUID();
    const entry = await AuditLogModel.create({
      actorId,
      action: "PATCH /api/v1/admin/products/123",
      entity: "product",
      entityId: "123",
      ip: "127.0.0.1",
      before: { priceRial: 100000 },
      after: { priceRial: 120000 },
    });

    expect(entry.actorId).toEqual(actorId);
    expect(entry.entity).toBe("product");
    expect(entry.before).toEqual({ priceRial: 100000 });
    expect(entry.after).toEqual({ priceRial: 120000 });
    expect(entry.get("createdAt")).toBeInstanceOf(Date);
  });

  it("does not soft-delete-filter records — an audit trail can't hide itself", async () => {
    // AuditLog deliberately skips applyBasePlugins/softDeletePlugin; this
    // just documents that a plain find() sees everything, unaffected by
    // the deletedAt convention other collections use.
    const before = await AuditLogModel.countDocuments({});
    await AuditLogModel.create({
      actorId: randomUUID(),
      action: "DELETE /api/v1/admin/products/999",
      entity: "product",
      entityId: "999",
    });
    const after = await AuditLogModel.countDocuments({});
    expect(after).toBe(before + 1);
  });
});
