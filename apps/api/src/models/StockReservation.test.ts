import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { StockReservationModel } from "./StockReservation.js";

const TEST_URI = testDbUri("parsian-store-test-stock-reservation");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("StockReservationModel", () => {
  it("requires productId, qty, and expiresAt", async () => {
    await expect(StockReservationModel.create({})).rejects.toThrow();
  });

  it("rejects a qty below 1", async () => {
    await expect(
      StockReservationModel.create({
        productId: new mongoose.Types.ObjectId(),
        qty: 0,
        expiresAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("stores a reservation with an optional refId", async () => {
    const reservation = await StockReservationModel.create({
      productId: new mongoose.Types.ObjectId(),
      qty: 2,
      refId: "cart-123",
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(reservation.qty).toBe(2);
    expect(reservation.refId).toBe("cart-123");
  });
});
