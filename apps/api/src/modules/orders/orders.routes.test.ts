import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { OrderModel, type Order } from "../../models/Order.js";
import { UserModel } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-orders-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await Promise.all([OrderModel.deleteMany({}), UserModel.deleteMany({})]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

function customerCookie(userId: string): string {
  const token = signAccessToken({ sub: userId, role: "customer", accountType: "retail" });
  return `accessToken=${token}`;
}

async function seedOrder(
  userId: mongoose.Types.ObjectId,
  overrides: Partial<Order> = {},
): Promise<mongoose.HydratedDocument<Order>> {
  const suffix = Math.floor(10_000 + Math.random() * 90_000);
  return OrderModel.create({
    code: `PS-1404-${suffix}`,
    userId,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        nameSnapshot: { fa: "لنت ترمز", en: "Brake pad" },
        skuSnapshot: "SKU-1",
        qty: 2,
        priceRial: 1_500_000,
      },
    ],
    subtotalRial: 3_000_000,
    discountRial: 0,
    shippingRial: 150_000,
    taxRial: 0,
    totalRial: 3_150_000,
    address: {
      province: { fa: "تهران", en: "Tehran" },
      city: { fa: "تهران", en: "Tehran" },
      line: "خیابان آزادی",
      postalCode: "1234567890",
      receiverName: "کاربر تست",
      receiverPhone: "09121234567",
    },
    shippingMethod: { code: "intracity", name: { fa: "پیک", en: "Courier" }, priceRial: 150_000 },
    status: "paid",
    statusHistory: [
      { status: "pending", at: new Date(Date.now() - 60_000) },
      { status: "paid", at: new Date() },
    ],
    ...overrides,
  });
}

describe("GET /me/orders", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/orders`);
    expect(res.status).toBe(401);
  });

  it("returns an empty list for a user with no orders", async () => {
    const user = await UserModel.create({ phone: "+989121110001", name: "تست" });
    const res = await fetch(`${baseUrl}/api/v1/me/orders`, {
      headers: { cookie: customerCookie(user.id as string) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toEqual([]);
    expect(body.meta?.total).toBe(0);
  });

  it("lists only the caller's own orders, newest first, paginated", async () => {
    const user = await UserModel.create({ phone: "+989121110002", name: "تست" });
    const stranger = await UserModel.create({ phone: "+989121110003", name: "غریبه" });
    await seedOrder(stranger._id);
    const first = await seedOrder(user._id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await seedOrder(user._id);

    const res = await fetch(`${baseUrl}/api/v1/me/orders`, {
      headers: { cookie: customerCookie(user.id as string) },
    });
    const body = (await res.json()) as Envelope<{ id: string; code: string; itemCount: number }[]>;
    expect(body.meta?.total).toBe(2);
    expect(body.data.map((o) => o.id)).toEqual([second._id.toString(), first._id.toString()]);
    expect(body.data[0]!.itemCount).toBe(2);
  });
});

describe("GET /me/orders/:code", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/orders/PS-1404-00001`);
    expect(res.status).toBe(401);
  });

  it("returns the full detail for the caller's own order", async () => {
    const user = await UserModel.create({ phone: "+989121110004", name: "تست" });
    const order = await seedOrder(user._id, { trackingCode: "TRACK-123" });

    const res = await fetch(`${baseUrl}/api/v1/me/orders/${order.code}`, {
      headers: { cookie: customerCookie(user.id as string) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{
      code: string;
      trackingCode?: string;
      items: unknown[];
      statusHistory: { status: string }[];
    }>;
    expect(body.data.code).toBe(order.code);
    expect(body.data.trackingCode).toBe("TRACK-123");
    expect(body.data.items).toHaveLength(1);
    expect(body.data.statusHistory.map((h) => h.status)).toEqual(["pending", "paid"]);
  });

  it("404s for an unknown code", async () => {
    const user = await UserModel.create({ phone: "+989121110005", name: "تست" });
    const res = await fetch(`${baseUrl}/api/v1/me/orders/PS-0000-00000`, {
      headers: { cookie: customerCookie(user.id as string) },
    });
    expect(res.status).toBe(404);
  });

  it("404s for another user's order (never leaks that the code exists)", async () => {
    const owner = await UserModel.create({ phone: "+989121110006", name: "صاحب" });
    const stranger = await UserModel.create({ phone: "+989121110007", name: "غریبه" });
    const order = await seedOrder(owner._id);

    const res = await fetch(`${baseUrl}/api/v1/me/orders/${order.code}`, {
      headers: { cookie: customerCookie(stranger.id as string) },
    });
    expect(res.status).toBe(404);
  });
});
