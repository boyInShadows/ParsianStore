import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { StockReservationModel } from "./StockReservation.js";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("StockReservationModel", () => {
  it("requires productId, qty, and expiresAt", async () => {
    await expect(StockReservationModel.create({})).rejects.toThrow();
  });

  it("rejects a qty below 1", async () => {
    await expect(
      StockReservationModel.create({
        productId: randomUUID(),
        qty: 0,
        expiresAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("stores a reservation with an optional refId", async () => {
    const reservation = await StockReservationModel.create({
      productId: randomUUID(),
      qty: 2,
      refId: "cart-123",
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(reservation.qty).toBe(2);
    expect(reservation.refId).toBe("cart-123");
  });
});
