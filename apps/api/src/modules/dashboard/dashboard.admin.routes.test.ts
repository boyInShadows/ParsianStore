import type { UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedOrder, seedProduct, seedUser, uniqueSuffix } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { AdminDashboardDto } from "schemas";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await resetDb();
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

/**
 * One order, optionally with a line item and a stated creation time.
 *
 * `createdAt` is a plain column, so a fixture simply says when this happened.
 * The Mongo version had to write through the raw driver, because its
 * timestamps plugin stripped a caller-supplied `createdAt` out of an update
 * and left every range test passing for the wrong reason.
 */
async function seedDashboardOrder(options: {
  status: OrderStatus;
  totalRial: number;
  createdAt?: Date;
  productId?: string;
  qty?: number;
  priceRial?: number;
}) {
  const user = await seedUser();
  const productId = options.productId ?? (await seedProductRow()).id;
  return seedOrder(user.id, {
    status: options.status,
    subtotalRial: options.totalRial,
    totalRial: options.totalRial,
    ...(options.createdAt ? { createdAt: options.createdAt } : {}),
    items: {
      create: [
        {
          productId,
          nameFaSnapshot: "نمونه",
          nameEnSnapshot: "Sample",
          skuSnapshot: `SKU-${uniqueSuffix()}`,
          qty: options.qty ?? 1,
          priceRial: options.priceRial ?? options.totalRial,
        },
      ],
    },
  });
}

async function seedProductRow(
  overrides: { sku?: string; stock?: number; lowStockAt?: number } = {},
) {
  return seedProduct({
    ...(overrides.sku ? { sku: overrides.sku, slug: overrides.sku.toLowerCase() } : {}),
    ...(overrides.stock === undefined ? {} : { stock: overrides.stock }),
    ...(overrides.lowStockAt === undefined ? {} : { lowStockAt: overrides.lowStockAt }),
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
    await seedDashboardOrder({ status: "paid", totalRial: 1_000_000 });
    await seedDashboardOrder({ status: "delivered", totalRial: 3_000_000 });
    await seedDashboardOrder({ status: "pending", totalRial: 9_000_000 });
    await seedDashboardOrder({ status: "cancelled", totalRial: 9_000_000 });
    await seedDashboardOrder({ status: "refunded", totalRial: 9_000_000 });

    const data = await getDashboard();

    expect(data.totals.revenueRial).toBe(4_000_000);
    expect(data.totals.orderCount).toBe(2);
    expect(data.totals.averageOrderRial).toBe(2_000_000);
  });

  it("excludes soft-deleted orders from revenue", async () => {
    const order = await seedDashboardOrder({ status: "paid", totalRial: 5_000_000 });
    await prisma.order.update({ where: { id: order.id }, data: { deletedAt: new Date() } });

    const data = await getDashboard();

    expect(data.totals.revenueRial).toBe(0);
  });

  it("keeps the average an integer Rial amount", async () => {
    await seedDashboardOrder({ status: "paid", totalRial: 1_000_000 });
    await seedDashboardOrder({ status: "paid", totalRial: 1_000_001 });

    const data = await getDashboard();

    expect(Number.isInteger(data.totals.averageOrderRial)).toBe(true);
  });

  it("scopes totals to the requested range", async () => {
    await seedDashboardOrder({ status: "paid", totalRial: 1_000_000 });
    await seedDashboardOrder({
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
    await seedDashboardOrder({ status: "paid", totalRial: 1_000_000 });
    await seedDashboardOrder({
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
    await seedDashboardOrder({ status: "paid", totalRial: 1_000_000 });

    const data = await getDashboard("?range=7d");

    expect(data.trend).toHaveLength(7);
    expect(data.trend.filter((point) => point.revenueRial === 0)).toHaveLength(6);
    expect(data.trend.at(-1)?.revenueRial).toBe(1_000_000);
  });

  it("breaks down every status, not just the revenue ones", async () => {
    await seedDashboardOrder({ status: "pending", totalRial: 1_000_000 });
    await seedDashboardOrder({ status: "pending", totalRial: 1_000_000 });
    await seedDashboardOrder({ status: "delivered", totalRial: 1_000_000 });

    const data = await getDashboard();
    const byStatus = new Map(data.statusBreakdown.map((row) => [row.status, row.count]));

    expect(byStatus.get("pending")).toBe(2);
    expect(byStatus.get("delivered")).toBe(1);
  });

  it("ranks top products by quantity sold using the order-line snapshot", async () => {
    const hot = (await seedProductRow()).id;
    const cold = (await seedProductRow()).id;
    await seedDashboardOrder({
      status: "paid",
      totalRial: 100,
      productId: hot,
      qty: 5,
      priceRial: 20,
    });
    await seedDashboardOrder({
      status: "paid",
      totalRial: 40,
      productId: cold,
      qty: 2,
      priceRial: 20,
    });

    const data = await getDashboard();

    expect(data.topProducts[0]?.productId).toBe(hot);
    expect(data.topProducts[0]?.qty).toBe(5);
    expect(data.topProducts[0]?.revenueRial).toBe(100);
  });

  it("flags products at or below their own low-stock threshold", async () => {
    await seedProductRow({ sku: "LOW-1", stock: 2, lowStockAt: 5 });
    await seedProductRow({ sku: "EDGE-1", stock: 5, lowStockAt: 5 });
    await seedProductRow({ sku: "OK-1", stock: 50, lowStockAt: 5 });

    const data = await getDashboard();

    expect(data.needsAction.lowStockProducts).toBe(2);
    expect(data.lowStockProducts.map((row) => row.sku).sort()).toEqual(["EDGE-1", "LOW-1"]);
  });

  // Not range-scoped on purpose: an order stuck in `pending` since last
  // month still needs a human today.
  it("counts open orders regardless of the selected range", async () => {
    await seedDashboardOrder({
      status: "pending",
      totalRial: 1_000_000,
      createdAt: new Date(Date.now() - 200 * DAY_MS),
    });

    const data = await getDashboard("?range=7d");

    expect(data.needsAction.pendingOrders).toBe(1);
  });

  it("lists recent orders newest first", async () => {
    await seedDashboardOrder({
      status: "paid",
      totalRial: 1_000_000,
      createdAt: new Date(Date.now() - 2 * DAY_MS),
    });
    const newest = await seedDashboardOrder({ status: "paid", totalRial: 2_000_000 });

    const data = await getDashboard();

    expect(data.recentOrders[0]?.code).toBe(newest.code);
  });

  it("counts new customers but not new staff accounts", async () => {
    await prisma.user.create({ data: { phone: "+989120000101", name: "مشتری", role: "customer" } });
    await prisma.user.create({ data: { phone: "+989120000102", name: "کارمند", role: "admin" } });

    const data = await getDashboard();

    expect(data.totals.newCustomers).toBe(1);
  });
});
