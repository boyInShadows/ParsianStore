import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { OrderModel, type Order } from "../../models/Order.js";
import { UserModel } from "../../models/User.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await Promise.all([OrderModel.deleteMany({}), UserModel.deleteMany({})]);
});

afterAll(async () => {
  close();
  await disconnectDB();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: randomUUID(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
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
        productId: randomUUID(),
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

describe("GET /admin/orders", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders`);
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("lists orders across every user, not just one, with customerPhone hydrated", async () => {
    const userA = await UserModel.create({ phone: "+989121110001", name: "کاربر یک" });
    const userB = await UserModel.create({ phone: "+989121110002", name: "کاربر دو" });
    await seedOrder(userA._id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await seedOrder(userB._id);

    const res = await fetch(`${baseUrl}/api/v1/admin/orders`, { headers: staffCookie() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ userId: string; customerPhone: string }[]>;
    expect(body.meta?.total).toBe(2);
    expect(body.data.map((o) => o.customerPhone).sort()).toEqual([
      "+989121110001",
      "+989121110002",
    ]);
  });

  it("filters by status", async () => {
    const user = await UserModel.create({ phone: "+989121110003", name: "تست" });
    await seedOrder(user._id, { status: "paid" });
    await seedOrder(user._id, { status: "cancelled" });

    const res = await fetch(`${baseUrl}/api/v1/admin/orders?status=cancelled`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<{ status: string }[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.status).toBe("cancelled");
  });
});

describe("GET /admin/orders/:id", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${randomUUID()}`);
    expect(res.status).toBe(401);
  });

  it("returns any user's order detail, not just the caller's", async () => {
    const owner = await UserModel.create({ phone: "+989121110004", name: "صاحب سفارش" });
    const order = await seedOrder(owner._id, { trackingCode: "TRACK-1" });

    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${order._id.toString()}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{
      code: string;
      customerPhone: string;
      trackingCode?: string;
    }>;
    expect(body.data.code).toBe(order.code);
    expect(body.data.customerPhone).toBe("+989121110004");
    expect(body.data.trackingCode).toBe("TRACK-1");
  });

  it("404s for a well-formed but nonexistent id", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${randomUUID()}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(404);
  });

  it("400s for a malformed id", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders/not-an-id`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /admin/orders/:id/status", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${randomUUID()}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "shipped" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${randomUUID()}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({ status: "shipped" }),
    });
    expect(res.status).toBe(403);
  });

  it("updates status and appends a statusHistory entry, note optional", async () => {
    const user = await UserModel.create({ phone: "+989121110005", name: "تست" });
    const order = await seedOrder(user._id);

    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${order._id.toString()}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ status: "shipped", note: "ارسال با پست" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{
      status: string;
      statusHistory: { status: string; note?: string }[];
    }>;
    expect(body.data.status).toBe("shipped");
    expect(body.data.statusHistory).toHaveLength(3);
    expect(body.data.statusHistory[2]).toMatchObject({ status: "shipped", note: "ارسال با پست" });

    const persisted = await OrderModel.findById(order._id);
    expect(persisted!.status).toBe("shipped");
  });

  it("rejects an invalid status value", async () => {
    const user = await UserModel.create({ phone: "+989121110006", name: "تست" });
    const order = await seedOrder(user._id);

    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${order._id.toString()}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ status: "not-a-real-status" }),
    });
    expect(res.status).toBe(400);
  });

  it("404s for a nonexistent order", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/orders/${randomUUID()}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ status: "shipped" }),
    });
    expect(res.status).toBe(404);
  });
});
