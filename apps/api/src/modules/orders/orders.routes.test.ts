import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedOrder as seedOrderRow, seedProduct, seedUser } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";

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

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

function customerCookie(userId: string): string {
  const token = signAccessToken({ sub: userId, role: "customer", accountType: "retail" });
  return `accessToken=${token}`;
}

/**
 * An order with one real line item.
 *
 * `OrderItem.productId` is a foreign key now, where the Mongo fixture
 * invented one -- so every order here owns a product. The status history is
 * a table too, and its two rows are created with explicit timestamps so the
 * detail assertion below still reads "pending then paid".
 */
async function seedOrder(
  userId: string,
  overrides: Partial<Prisma.OrderUncheckedCreateInput> = {},
) {
  const product = await seedProduct();
  return seedOrderRow(userId, {
    subtotalRial: 3_000_000,
    shippingRial: 150_000,
    totalRial: 3_150_000,
    shipMethodCode: "intracity",
    shipMethodFa: "پیک",
    shipMethodEn: "Courier",
    shipPriceRial: 150_000,
    status: "paid",
    items: {
      create: [
        {
          productId: product.id,
          nameFaSnapshot: "لنت ترمز",
          nameEnSnapshot: "Brake pad",
          skuSnapshot: "SKU-1",
          qty: 2,
          priceRial: 1_500_000,
        },
      ],
    },
    statusHistory: {
      create: [
        { status: "pending", at: new Date(Date.now() - 60_000) },
        { status: "paid", at: new Date() },
      ],
    },
    ...overrides,
  });
}

describe("GET /me/orders", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/orders`);
    expect(res.status).toBe(401);
  });

  it("returns an empty list for a user with no orders", async () => {
    const user = await seedUser({ phone: "+989121110001", name: "تست" });
    const res = await fetch(`${baseUrl}/api/v1/me/orders`, {
      headers: { cookie: customerCookie(user.id) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toEqual([]);
    expect(body.meta?.total).toBe(0);
  });

  it("lists only the caller's own orders, newest first, paginated", async () => {
    const user = await seedUser({ phone: "+989121110002", name: "تست" });
    const stranger = await seedUser({ phone: "+989121110003", name: "غریبه" });
    await seedOrder(stranger.id);
    const first = await seedOrder(user.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await seedOrder(user.id);

    const res = await fetch(`${baseUrl}/api/v1/me/orders`, {
      headers: { cookie: customerCookie(user.id) },
    });
    const body = (await res.json()) as Envelope<{ id: string; code: string; itemCount: number }[]>;
    expect(body.meta?.total).toBe(2);
    expect(body.data.map((o) => o.id)).toEqual([second.id, first.id]);
    expect(body.data[0]!.itemCount).toBe(2);
  });
});

describe("GET /me/orders/:code", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/orders/PS-1404-00001`);
    expect(res.status).toBe(401);
  });

  it("returns the full detail for the caller's own order", async () => {
    const user = await seedUser({ phone: "+989121110004", name: "تست" });
    const order = await seedOrder(user.id, { trackingCode: "TRACK-123" });

    const res = await fetch(`${baseUrl}/api/v1/me/orders/${order.code}`, {
      headers: { cookie: customerCookie(user.id) },
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
    const user = await seedUser({ phone: "+989121110005", name: "تست" });
    const res = await fetch(`${baseUrl}/api/v1/me/orders/PS-0000-00000`, {
      headers: { cookie: customerCookie(user.id) },
    });
    expect(res.status).toBe(404);
  });

  it("404s for another user's order (never leaks that the code exists)", async () => {
    const owner = await seedUser({ phone: "+989121110006", name: "صاحب" });
    const stranger = await seedUser({ phone: "+989121110007", name: "غریبه" });
    const order = await seedOrder(owner.id);

    const res = await fetch(`${baseUrl}/api/v1/me/orders/${order.code}`, {
      headers: { cookie: customerCookie(stranger.id) },
    });
    expect(res.status).toBe(404);
  });
});
