import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB } from "../../../config/testDb.js";
import { OrderModel } from "../../models/Order.js";
import { PaymentModel } from "../../models/Payment.js";
import { reconcilePayments } from "./payments.admin.service.js";

beforeAll(() => mongoose.connect(testDbUri("parsian-store-test-reconciliation")));
beforeEach(() => Promise.all([OrderModel.deleteMany({}), PaymentModel.deleteMany({})]));
afterAll(async () => {
  await disconnectDB();
});

describe("payment reconciliation", () => {
  it("flags amount and status mismatches", async () => {
    const orderId = randomUUID();
    await OrderModel.collection.insertOne({
      _id: orderId,
      code: "PS-1405-10001",
      status: "pending",
      totalRial: 200,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await PaymentModel.create({ orderId, provider: "mock", amountRial: 100, status: "success" });
    const result = await reconcilePayments();
    expect(result.rows[0]?.issues).toEqual(
      expect.arrayContaining(["amount-mismatch", "payment-success-order-unpaid"]),
    );
  });

  it("flags stale initiated payments without authority", async () => {
    const orderId = randomUUID();
    await OrderModel.collection.insertOne({
      _id: orderId,
      code: "PS-1405-10002",
      status: "pending",
      totalRial: 100,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    const payment = await PaymentModel.create({
      orderId,
      provider: "mock",
      amountRial: 100,
      status: "initiated",
    });
    await PaymentModel.collection.updateOne(
      { _id: payment._id },
      { $set: { createdAt: new Date(0) } },
    );
    const result = await reconcilePayments(new Date(60 * 60 * 1000));
    expect(result.rows[0]?.issues).toEqual(
      expect.arrayContaining(["stale-initiated", "missing-authority"]),
    );
  });
});
