import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { InventoryMoveModel } from "./InventoryMove.js";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("InventoryMoveModel", () => {
  it("records a positive or negative delta with a fixed reason", async () => {
    const move = await InventoryMoveModel.create({
      productId: randomUUID(),
      delta: -3,
      reason: "reservation",
      refId: "res-1",
    });
    expect(move.delta).toBe(-3);
    expect(move.byUserId).toBeUndefined();
  });

  it("rejects a reason outside the fixed enum", async () => {
    await expect(
      InventoryMoveModel.create({
        productId: randomUUID(),
        delta: 1,
        reason: "because-i-said-so",
      }),
    ).rejects.toThrow();
  });

  it("requires productId, delta, and reason", async () => {
    await expect(InventoryMoveModel.create({})).rejects.toThrow();
  });
});
