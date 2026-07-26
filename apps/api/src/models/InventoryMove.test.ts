import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { InventoryMoveModel } from "./InventoryMove.js";

const TEST_URI = testDbUri("parsian-store-test-inventory-move");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("InventoryMoveModel", () => {
  it("records a positive or negative delta with a fixed reason", async () => {
    const move = await InventoryMoveModel.create({
      productId: new mongoose.Types.ObjectId(),
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
        productId: new mongoose.Types.ObjectId(),
        delta: 1,
        reason: "because-i-said-so",
      }),
    ).rejects.toThrow();
  });

  it("requires productId, delta, and reason", async () => {
    await expect(InventoryMoveModel.create({})).rejects.toThrow();
  });
});
