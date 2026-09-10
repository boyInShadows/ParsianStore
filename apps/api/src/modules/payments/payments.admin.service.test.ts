import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { seedOrder, seedUser } from "../../test/factories.js";
import { reconcilePayments } from "./payments.admin.service.js";

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("payment reconciliation", () => {
  it("flags amount and status mismatches", async () => {
    // The Mongo version of this test wrote through the raw collection to
    // fabricate an order the model would have rejected, and pointed the
    // payment at an id no order had. A foreign key makes both impossible, so
    // the fixture is a real order -- which is what production would have
    // anyway, and the mismatch under test is the *amount*, not the reference.
    const user = await seedUser();
    const order = await seedOrder(user.id, {
      code: "PS-1405-10001",
      status: "pending",
      totalRial: 200,
    });
    await prisma.payment.create({
      data: { orderId: order.id, provider: "mock", amountRial: 100, status: "success" },
    });

    const result = await reconcilePayments();

    expect(result.rows[0]?.issues).toEqual(
      expect.arrayContaining(["amount-mismatch", "payment-success-order-unpaid"]),
    );
  });

  it("flags stale initiated payments without authority", async () => {
    const user = await seedUser();
    const order = await seedOrder(user.id, {
      code: "PS-1405-10002",
      status: "pending",
      totalRial: 100,
    });
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "mock",
        amountRial: 100,
        status: "initiated",
        // A plain column, so the fixture simply states when this happened --
        // the Mongo version needed a second raw-driver write, because its
        // timestamps plugin stripped a caller-supplied createdAt.
        createdAt: new Date(0),
      },
    });

    const result = await reconcilePayments(new Date(60 * 60 * 1000));

    expect(result.rows[0]?.issues).toEqual(
      expect.arrayContaining(["stale-initiated", "missing-authority"]),
    );
  });

  it("flags a settled order with no payment at all", async () => {
    const user = await seedUser();
    await seedOrder(user.id, { code: "PS-1405-10003", status: "delivered", totalRial: 500 });

    const result = await reconcilePayments();

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.issues).toEqual(["order-paid-payment-unsettled"]);
  });
});
