import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct, seedUser } from "../../test/factories.js";
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
}

interface CheckoutInitiateDto {
  orderId: string;
  orderCode: string;
  redirectUrl: string;
}

function customerCookie(userId: string, accountType: "retail" | "wholesale" = "retail"): string {
  const token = signAccessToken({ sub: userId, role: "customer", accountType });
  return `accessToken=${token}`;
}

// Idempotent (find-or-create) -- createUserWithAddress calls this once per
// user it sets up, and several tests need more than one user in the same
// run (e.g. "belongs to a different user"), all sharing the same Tehran
// fixture rather than colliding on the unique province/city slug. The slug
// itself matters: shipping.service.ts resolves the Tehran zone from it.
async function seedGeo() {
  const tehran = await prisma.province.upsert({
    where: { slug: "tehran" },
    create: { nameFa: "تهران", nameEn: "Tehran", slug: "tehran" },
    update: {},
  });
  const tehranCity = await prisma.city.upsert({
    where: { provinceId_slug: { provinceId: tehran.id, slug: "tehran-city" } },
    create: { provinceId: tehran.id, nameFa: "تهران", nameEn: "Tehran", slug: "tehran-city" },
    update: {},
  });
  return { tehran, tehranCity };
}

async function seedShippingRates() {
  const exists = await prisma.shippingRate.findFirst({ where: { methodCode: "intracity" } });
  if (exists) return;
  await prisma.shippingRate.createMany({
    data: [
      {
        methodCode: "post-pishtaz",
        zone: "tehran",
        minWeightGram: 0,
        maxWeightGram: null,
        priceRial: 250_000,
      },
      {
        methodCode: "intracity",
        zone: "tehran",
        minWeightGram: 0,
        maxWeightGram: null,
        priceRial: 150_000,
      },
    ],
  });
}

async function createUserWithAddress(): Promise<{
  userId: string;
  cookie: string;
  addressId: string;
}> {
  const user = await seedUser({ name: "Checkout Test User" });
  const userId = user.id;
  const cookie = customerCookie(userId);
  const { tehran, tehranCity } = await seedGeo();
  await seedShippingRates();

  const addrRes = await fetch(`${baseUrl}/api/v1/me/addresses`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      provinceId: tehran.id,
      cityId: tehranCity.id,
      line: "خیابان آزادی",
      postalCode: "1234567890",
      receiverName: "کاربر تست",
      receiverPhone: "09121234567",
    }),
  });
  const addrBody = (await addrRes.json()) as Envelope<{ id: string }>;
  return { userId, cookie, addressId: addrBody.data.id };
}

async function addToCart(cookie: string, productId: string, qty: number): Promise<void> {
  await fetch(`${baseUrl}/api/v1/cart/items`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ productId, qty }),
  });
}

describe("POST /checkout/initiate", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        addressId: randomUUID(),
        shippingMethodCode: "intracity",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("400s for an empty cart", async () => {
    const { cookie, addressId } = await createUserWithAddress();
    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    expect(res.status).toBe(400);
  });

  it("400s for an address belonging to a different user", async () => {
    const product = await seedProduct();
    const { cookie } = await createUserWithAddress();
    await addToCart(cookie, product.id, 1);
    const { addressId: otherAddressId } = await createUserWithAddress();

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId: otherAddressId, shippingMethodCode: "intracity" }),
    });
    expect(res.status).toBe(400);
  });

  it("400s for a shipping method not available in this zone", async () => {
    const product = await seedProduct();
    const { cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product.id, 1);

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "tipax" }),
    });
    expect(res.status).toBe(400);
  });

  it("409s when a cart line's stock is insufficient", async () => {
    const product = await seedProduct({ stock: 1 });
    const { cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product.id, 2);

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    expect(res.status).toBe(409);
    // No reservation/order should have been left behind by a rejected attempt.
    await expect(prisma.stockReservation.count()).resolves.toBe(0);
    await expect(prisma.order.count()).resolves.toBe(0);
  });

  it("creates a pending order, reserves stock, and returns a redirectUrl", async () => {
    const product = await seedProduct({ stock: 5, priceRial: 1_500_000 });
    const { userId, cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product.id, 2);

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<CheckoutInitiateDto>;
    expect(body.data.orderCode).toMatch(/^PS-\d{4}-\d{5}$/);
    // Points at the web app's own result page, not the API's JSON
    // endpoint -- this is what the gateway redirects a real browser to.
    expect(body.data.redirectUrl).toContain("/checkout/result");

    const order = await prisma.order.findUnique({
      where: { id: body.data.orderId },
      include: { items: true, statusHistory: { orderBy: { at: "asc" } } },
    });
    expect(order).not.toBeNull();
    expect(order!.status).toBe("pending");
    expect(order!.userId).toBe(userId);
    expect(order!.subtotalRial).toBe(3_000_000);
    expect(order!.shippingRial).toBe(150_000);
    expect(order!.totalRial).toBe(3_150_000);
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0]!.skuSnapshot).toBe(product.sku);

    const payment = await prisma.payment.findFirst({ where: { orderId: order!.id } });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe("initiated");
    expect(payment!.authority).toBeTruthy();
    expect(payment!.amountRial).toBe(3_150_000);

    const reservations = await prisma.stockReservation.findMany({
      where: { refId: body.data.orderId },
    });
    expect(reservations).toHaveLength(1);
    expect(reservations[0]!.qty).toBe(2);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct!.stock).toBe(3);
  });
});

describe("GET /payments/callback", () => {
  // The gateway callback the browser actually lands on now points at the
  // web app's own /checkout/result page (see checkout.service.ts's
  // buildPaymentResultUrl), not this API -- so these tests build the
  // real API callback URL directly from orderId + the Payment's own
  // authority (fetched from the DB), the same way the NOK test below
  // already had to, rather than trying to fetch a redirectUrl that no
  // longer points here at all.
  async function initiate(): Promise<{
    userId: string;
    cookie: string;
    orderId: string;
    callbackUrl: string;
    product: Awaited<ReturnType<typeof seedProduct>>;
  }> {
    const product = await seedProduct({ stock: 5, priceRial: 1_500_000 });
    const { userId, cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product.id, 2);
    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    const body = (await res.json()) as Envelope<CheckoutInitiateDto>;
    const orderId = body.data.orderId;
    const payment = await prisma.payment.findFirst({ where: { orderId } });
    const callbackUrl = `${baseUrl}/api/v1/payments/callback?orderId=${orderId}&Authority=${payment!.authority}&Status=OK`;
    return { userId, cookie, orderId, callbackUrl, product };
  }

  it("404s for an unknown order/authority pair", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/payments/callback?orderId=${randomUUID()}&Authority=nope&Status=OK`,
    );
    expect(res.status).toBe(404);
  });

  it("on Status=OK, verifies, marks the order paid, confirms stock, and clears the cart", async () => {
    const { cookie, orderId, callbackUrl, product } = await initiate();

    const res = await fetch(callbackUrl);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ orderCode: string; status: string }>;
    expect(body.data.status).toBe("paid");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, statusHistory: { orderBy: { at: "asc" } } },
    });
    expect(order!.status).toBe("paid");
    expect(order!.statusHistory.map((h) => h.status)).toEqual(["pending", "paid"]);

    const payment = await prisma.payment.findFirst({ where: { orderId } });
    expect(payment!.status).toBe("success");
    expect(payment!.verifiedAt).toBeTruthy();

    // Reservation resolved (confirmed, not restored) -- stock stays down.
    await expect(prisma.stockReservation.count({ where: { refId: orderId } })).resolves.toBe(0);
    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct!.stock).toBe(3);
    await expect(
      prisma.inventoryMove.count({
        where: { productId: product.id, reason: "reservation_confirmed" },
      }),
    ).resolves.toBe(1);

    const cartRes = await fetch(`${baseUrl}/api/v1/cart`, { headers: { cookie } });
    const cartBody = (await cartRes.json()) as Envelope<{ items: unknown[] }>;
    expect(cartBody.data.items).toEqual([]);
  });

  it("is idempotent -- a repeat callback for the same payment doesn't double-process", async () => {
    const { callbackUrl, orderId, product } = await initiate();

    await fetch(callbackUrl);
    const second = await fetch(callbackUrl);
    expect(second.status).toBe(200);
    const body = (await second.json()) as Envelope<{ status: string }>;
    expect(body.data.status).toBe("paid");

    // Confirming reservations twice would be a no-op either way (they're
    // deleted after the first confirm), but the real risk this guards is
    // stock being touched again -- still exactly the one decrement.
    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct!.stock).toBe(3);
    await expect(
      prisma.inventoryMove.count({
        where: { productId: product.id, reason: "reservation_confirmed" },
      }),
    ).resolves.toBe(1);
    void orderId;
  });

  it("on Status=NOK, cancels the order and releases the reservation without calling verify", async () => {
    const { orderId, product } = await initiate();
    const payment = await prisma.payment.findFirst({ where: { orderId } });

    const res = await fetch(
      `${baseUrl}/api/v1/payments/callback?orderId=${orderId}&Authority=${payment!.authority}&Status=NOK`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ status: string }>;
    expect(body.data.status).toBe("cancelled");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, statusHistory: { orderBy: { at: "asc" } } },
    });
    expect(order!.status).toBe("cancelled");

    const updatedPayment = await prisma.payment.findFirst({ where: { orderId } });
    expect(updatedPayment!.status).toBe("failed");

    // Reservation released -- stock restored to what it was before checkout.
    await expect(prisma.stockReservation.count({ where: { refId: orderId } })).resolves.toBe(0);
    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct!.stock).toBe(5);
  });
});

describe("P6.S7: coupon discount through checkout + payment", () => {
  it("snapshots the applied coupon's discount onto the Order, and increments usedCount only on real payment success", async () => {
    await prisma.coupon.create({ data: { code: "SAVE10", type: "percent", value: 10 } });
    const product = await seedProduct({ stock: 5, priceRial: 1_500_000 });
    const { cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product.id, 2);
    await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "save10" }),
    });

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<CheckoutInitiateDto>;

    // subtotal 3,000,000 - 10% (300,000) + shipping 150,000 = 2,850,000
    const order = await prisma.order.findUnique({
      where: { id: body.data.orderId },
      include: { items: true, statusHistory: { orderBy: { at: "asc" } } },
    });
    expect(order!.discountRial).toBe(300_000);
    expect(order!.couponCode).toBe("SAVE10");
    expect(order!.totalRial).toBe(2_850_000);

    const couponBeforePayment = await prisma.coupon.findUnique({ where: { code: "SAVE10" } });
    expect(couponBeforePayment!.usedCount).toBe(0);

    const payment = await prisma.payment.findFirst({ where: { orderId: order!.id } });
    const callbackRes = await fetch(
      `${baseUrl}/api/v1/payments/callback?orderId=${order!.id}&Authority=${payment!.authority}&Status=OK`,
    );
    expect(callbackRes.status).toBe(200);

    const couponAfterPayment = await prisma.coupon.findUnique({ where: { code: "SAVE10" } });
    expect(couponAfterPayment!.usedCount).toBe(1);
  });

  it("does not increment usedCount when the payment is cancelled (Status=NOK)", async () => {
    await prisma.coupon.create({ data: { code: "SAVE10", type: "percent", value: 10 } });
    const product = await seedProduct({ stock: 5, priceRial: 1_500_000 });
    const { cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product.id, 1);
    await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "SAVE10" }),
    });

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    const body = (await res.json()) as Envelope<CheckoutInitiateDto>;
    const payment = await prisma.payment.findFirst({ where: { orderId: body.data.orderId } });

    await fetch(
      `${baseUrl}/api/v1/payments/callback?orderId=${body.data.orderId}&Authority=${payment!.authority}&Status=NOK`,
    );

    const coupon = await prisma.coupon.findUnique({ where: { code: "SAVE10" } });
    expect(coupon!.usedCount).toBe(0);
  });
});
