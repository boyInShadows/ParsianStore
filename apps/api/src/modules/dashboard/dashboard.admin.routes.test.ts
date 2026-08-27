import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../../config/testDb.js";
import { OrderModel, type OrderStatus } from "../../models/Order.js";
import { ProductModel } from "../../models/Product.js";
import { UserModel, type UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { AdminDashboardDto } from "schemas";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await Promise.all([
    OrderModel.deleteMany({}),
    ProductModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  close();
  await disconnectDB();
});

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: randomUUID(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

const LOCALIZED = { fa: "نمونه", en: "Sample" };

let orderCounter = 0;

async function seedOrder(options: {
  status: OrderStatus;
  totalRial: number;
  createdAt?: Date;
  productId?: mongoose.Types.ObjectId;
  qty?: number;
  priceRial?: number;
}) {
  orderCounter += 1;
  const order = await OrderModel.create({
    code: `PS-${String(orderCounter).padStart(5, "0")}`,
    userId: randomUUID(),
    items: [
      {
        productId: options.productId ?? randomUUID(),
        nameSnapshot: LOCALIZED,
        skuSnapshot: `SKU-${orderCounter}`,
        qty: options.qty ?? 1,
        priceRial: options.priceRial ?? options.totalRial,
      },
    ],
    subtotalRial: options.totalRial,
    shippingRial: 0,
    totalRial: options.totalRial,
    address: {
      province: LOCALIZED,
      city: LOCALIZED,
      line: "خیابان نمونه",
      postalCode: "1234567890",
      receiverName: "گیرنده",
      receiverPhone: "+989120000000",
    },
    shippingMethod: { code: "post", name: LOCALIZED, priceRial: 0 },
    status: options.status,
  });
  if (options.createdAt) {
    // Raw driver, not OrderModel.updateOne: the timestamps plugin strips a
    // caller-supplied `createdAt` out of an update, so a Mongoose write
    // silently leaves the order dated "now" and every range test passes
    // for the wrong reason.
    await OrderModel.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt: options.createdAt } },
    );
  }
  return order;
}

async function seedProduct(overrides: { sku: string; stock: number; lowStockAt: number }) {
  return ProductModel.create({
    name: LOCALIZED,
    slug: overrides.sku.toLowerCase(),
    sku: overrides.sku,
    brandId: randomUUID(),
    categoryId: randomUUID(),
    priceRial: 1_000_000,
    stock: overrides.stock,
    lowStockAt: overrides.lowStockAt,
    weightGram: 500,
    dimensions: { lengthMm: 10, widthMm: 10, heightMm: 10 },
    warranty: { months: 6, text: "شش ماه" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "SAIPA",
      countryOfManufacture: "ایران",
      verificationCode: `VC-${overrides.sku}`,
    },
    status: "active",
  });
}

async function getDashboard(query = ""): Promise<AdminDashboardDto> {
  const res = await fetch(`${baseUrl}/api/v1/admin/dashboard${query}`, { headers: staffCookie() });
  const body = (await res.json()) as { data: AdminDashboardDto };
  return body.data;
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("admin dashboard routes", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard`);
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in customer", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("rejects a range outside the enum", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard?range=all-time`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(400);
  });

  it("returns zeroed totals with no data at all", async () => {
    const data = await getDashboard();
    expect(data.totals).toEqual({
      revenueRial: 0,
      orderCount: 0,
      averageOrderRial: 0,
      newCustomers: 0,
    });
  });

  it("counts only paid-through-delivered orders as revenue", async () => {
    await seedOrder({ status: "paid", totalRial: 1_000_000 });
    await seedOrder({ status: "delivered", totalRial: 3_000_000 });
    await seedOrder({ status: "pending", totalRial: 9_000_000 });
    await seedOrder({ status: "cancelled", totalRial: 9_000_000 });
    await seedOrder({ status: "refunded", totalRial: 9_000_000 });

    const data = await getDashboard();

    expect(data.totals.revenueRial).toBe(4_000_000);
    expect(data.totals.orderCount).toBe(2);
    expect(data.totals.averageOrderRial).toBe(2_000_000);
  });

  it("excludes soft-deleted orders from revenue", async () => {
    const order = await seedOrder({ status: "paid", totalRial: 5_000_000 });
    await order.softDelete();

    const data = await getDashboard();

    expect(data.totals.revenueRial).toBe(0);
  });

  it("keeps the average an integer Rial amount", async () => {
    await seedOrder({ status: "paid", totalRial: 1_000_000 });
    await seedOrder({ status: "paid", totalRial: 1_000_001 });

    const data = await getDashboard();

    expect(Number.isInteger(data.totals.averageOrderRial)).toBe(true);
  });

  it("scopes totals to the requested range", async () => {
    await seedOrder({ status: "paid", totalRial: 1_000_000 });
    await seedOrder({
      status: "paid",
      totalRial: 7_000_000,
      createdAt: new Date(Date.now() - 20 * DAY_MS),
    });

    const week = await getDashboard("?range=7d");
    const month = await getDashboard("?range=30d");

    expect(week.totals.revenueRial).toBe(1_000_000);
    expect(month.totals.revenueRial).toBe(8_000_000);
  });

  it("reports the preceding window separately so a delta can be shown", async () => {
    await seedOrder({ status: "paid", totalRial: 1_000_000 });
    await seedOrder({
      status: "paid",
      totalRial: 4_000_000,
      createdAt: new Date(Date.now() - 9 * DAY_MS),
    });

    const data = await getDashboard("?range=7d");

    expect(data.totals.revenueRial).toBe(1_000_000);
    expect(data.previousTotals.revenueRial).toBe(4_000_000);
  });

  // A gap-skipping trend line silently misrepresents the shape of the
  // week, which is the one thing this chart exists to show.
  it("zero-fills days with no orders", async () => {
    await seedOrder({ status: "paid", totalRial: 1_000_000 });

    const data = await getDashboard("?range=7d");

    expect(data.trend).toHaveLength(7);
    expect(data.trend.filter((point) => point.revenueRial === 0)).toHaveLength(6);
    expect(data.trend.at(-1)?.revenueRial).toBe(1_000_000);
  });

  it("breaks down every status, not just the revenue ones", async () => {
    await seedOrder({ status: "pending", totalRial: 1_000_000 });
    await seedOrder({ status: "pending", totalRial: 1_000_000 });
    await seedOrder({ status: "delivered", totalRial: 1_000_000 });

    const data = await getDashboard();
    const byStatus = new Map(data.statusBreakdown.map((row) => [row.status, row.count]));

    expect(byStatus.get("pending")).toBe(2);
    expect(byStatus.get("delivered")).toBe(1);
  });

  it("ranks top products by quantity sold using the order-line snapshot", async () => {
    const hot = randomUUID();
    const cold = randomUUID();
    await seedOrder({ status: "paid", totalRial: 100, productId: hot, qty: 5, priceRial: 20 });
    await seedOrder({ status: "paid", totalRial: 40, productId: cold, qty: 2, priceRial: 20 });

    const data = await getDashboard();

    expect(data.topProducts[0]?.productId).toBe(hot.toString());
    expect(data.topProducts[0]?.qty).toBe(5);
    expect(data.topProducts[0]?.revenueRial).toBe(100);
  });

  it("flags products at or below their own low-stock threshold", async () => {
    await seedProduct({ sku: "LOW-1", stock: 2, lowStockAt: 5 });
    await seedProduct({ sku: "EDGE-1", stock: 5, lowStockAt: 5 });
    await seedProduct({ sku: "OK-1", stock: 50, lowStockAt: 5 });

    const data = await getDashboard();

    expect(data.needsAction.lowStockProducts).toBe(2);
    expect(data.lowStockProducts.map((row) => row.sku).sort()).toEqual(["EDGE-1", "LOW-1"]);
  });

  // Not range-scoped on purpose: an order stuck in `pending` since last
  // month still needs a human today.
  it("counts open orders regardless of the selected range", async () => {
    await seedOrder({
      status: "pending",
      totalRial: 1_000_000,
      createdAt: new Date(Date.now() - 200 * DAY_MS),
    });

    const data = await getDashboard("?range=7d");

    expect(data.needsAction.pendingOrders).toBe(1);
  });

  it("lists recent orders newest first", async () => {
    await seedOrder({
      status: "paid",
      totalRial: 1_000_000,
      createdAt: new Date(Date.now() - 2 * DAY_MS),
    });
    const newest = await seedOrder({ status: "paid", totalRial: 2_000_000 });

    const data = await getDashboard();

    expect(data.recentOrders[0]?.code).toBe(newest.code);
  });

  it("counts new customers but not new staff accounts", async () => {
    await UserModel.create({ phone: "+989120000101", name: "مشتری", role: "customer" });
    await UserModel.create({ phone: "+989120000102", name: "کارمند", role: "admin" });

    const data = await getDashboard();

    expect(data.totals.newCustomers).toBe(1);
  });
});
