import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CartModel } from "../../models/Cart.js";
import { CategoryModel } from "../../models/Category.js";
import { CityModel } from "../../models/City.js";
import { InventoryMoveModel } from "../../models/InventoryMove.js";
import { OrderModel } from "../../models/Order.js";
import { PaymentModel } from "../../models/Payment.js";
import { ProductModel } from "../../models/Product.js";
import { ProvinceModel } from "../../models/Province.js";
import { ShippingRateModel } from "../../models/ShippingRate.js";
import { StockReservationModel } from "../../models/StockReservation.js";
import { UserModel } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-checkout-routes");
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
  await Promise.all([
    CartModel.deleteMany({}),
    ProductModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    BrandModel.deleteMany({}),
    CityModel.deleteMany({}),
    ProvinceModel.deleteMany({}),
    ShippingRateModel.deleteMany({}),
    UserModel.deleteMany({}),
    OrderModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    StockReservationModel.deleteMany({}),
    InventoryMoveModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
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

async function seedProduct(overrides: Record<string, unknown> = {}) {
  const brand = await BrandModel.create({
    name: { fa: "بوش", en: "Bosch" },
    slug: `bosch-${new mongoose.Types.ObjectId().toString()}`,
    country: "Germany",
  });
  const category = await CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: `brakes-${new mongoose.Types.ObjectId().toString()}`,
    systemCode: "SYS-04",
  });
  const sku = `SKU-${new mongoose.Types.ObjectId().toString()}`;
  return ProductModel.create({
    name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
    slug: `front-brake-pad-${sku}`,
    sku,
    brandId: brand._id,
    categoryId: category._id,
    priceRial: 1_500_000,
    stock: 10,
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${sku}`,
    },
    ...overrides,
  });
}

// Idempotent (find-or-create) -- createUserWithAddress calls this once per
// user it sets up, and several tests need more than one user in the same
// run (e.g. "belongs to a different user"), all sharing the same Tehran
// fixture rather than colliding on Province/City's unique `slug` index.
async function seedGeo() {
  const tehran =
    (await ProvinceModel.findOne({ slug: "tehran" })) ??
    (await ProvinceModel.create({ name: { fa: "تهران", en: "Tehran" }, slug: "tehran" }));
  const tehranCity =
    (await CityModel.findOne({ slug: "tehran-city" })) ??
    (await CityModel.create({
      provinceId: tehran._id,
      name: { fa: "تهران", en: "Tehran" },
      slug: "tehran-city",
    }));
  return { tehran, tehranCity };
}

async function seedShippingRates() {
  const exists = await ShippingRateModel.exists({ methodCode: "intracity" });
  if (exists) return;
  await ShippingRateModel.insertMany([
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
  ]);
}

async function createUserWithAddress(): Promise<{
  userId: string;
  cookie: string;
  addressId: string;
}> {
  const user = await UserModel.create({
    phone: `+989${Math.floor(100000000 + Math.random() * 800000000)}`,
    name: "Checkout Test User",
  });
  const userId = user.id as string;
  const cookie = customerCookie(userId);
  const { tehran, tehranCity } = await seedGeo();
  await seedShippingRates();

  const addrRes = await fetch(`${baseUrl}/api/v1/me/addresses`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      provinceId: tehran._id.toString(),
      cityId: tehranCity._id.toString(),
      line: "خیابان آزادی",
      postalCode: "1234567890",
      receiverName: "کاربر تست",
      receiverPhone: "09121234567",
    }),
  });
  const addrBody = (await addrRes.json()) as Envelope<{ id: string }>;
  return { userId, cookie, addressId: addrBody.data.id };
}

/** MockPaymentProvider builds its redirectUrl from env.PUBLIC_URL
 * (checkout.service.ts's buildPaymentCallbackUrl), which in production
 * is the API's own real address -- but this test server binds to a fresh
 * ephemeral port (`app.listen(0)`) precisely so parallel test files never
 * collide, so PUBLIC_URL's fixed default port won't actually match it.
 * Replays the same path + query against the real `baseUrl` instead --
 * this is a test-environment seam, not a behavior the product code
 * should special-case for. */
function callbackUrlOnTestServer(redirectUrl: string): string {
  const { pathname, search } = new URL(redirectUrl);
  return `${baseUrl}${pathname}${search}`;
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
        addressId: new mongoose.Types.ObjectId().toString(),
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
    await addToCart(cookie, product._id.toString(), 1);
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
    await addToCart(cookie, product._id.toString(), 1);

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
    await addToCart(cookie, product._id.toString(), 2);

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    expect(res.status).toBe(409);
    // No reservation/order should have been left behind by a rejected attempt.
    await expect(StockReservationModel.countDocuments({})).resolves.toBe(0);
    await expect(OrderModel.countDocuments({})).resolves.toBe(0);
  });

  it("creates a pending order, reserves stock, and returns a redirectUrl", async () => {
    const product = await seedProduct({ stock: 5, priceRial: 1_500_000 });
    const { userId, cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product._id.toString(), 2);

    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<CheckoutInitiateDto>;
    expect(body.data.orderCode).toMatch(/^PS-\d{4}-\d{5}$/);
    expect(body.data.redirectUrl).toContain("/api/v1/payments/callback");

    const order = await OrderModel.findById(body.data.orderId);
    expect(order).not.toBeNull();
    expect(order!.status).toBe("pending");
    expect(order!.userId.toString()).toBe(userId);
    expect(order!.subtotalRial).toBe(3_000_000);
    expect(order!.shippingRial).toBe(150_000);
    expect(order!.totalRial).toBe(3_150_000);
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0]!.skuSnapshot).toBe(product.sku);

    const payment = await PaymentModel.findOne({ orderId: order!._id });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe("initiated");
    expect(payment!.authority).toBeTruthy();
    expect(payment!.amountRial).toBe(3_150_000);

    const reservations = await StockReservationModel.find({ refId: body.data.orderId });
    expect(reservations).toHaveLength(1);
    expect(reservations[0]!.qty).toBe(2);

    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct!.stock).toBe(3);
  });
});

describe("GET /payments/callback", () => {
  async function initiate(): Promise<{
    userId: string;
    cookie: string;
    orderId: string;
    redirectUrl: string;
    product: Awaited<ReturnType<typeof seedProduct>>;
  }> {
    const product = await seedProduct({ stock: 5, priceRial: 1_500_000 });
    const { userId, cookie, addressId } = await createUserWithAddress();
    await addToCart(cookie, product._id.toString(), 2);
    const res = await fetch(`${baseUrl}/api/v1/checkout/initiate`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId, shippingMethodCode: "intracity" }),
    });
    const body = (await res.json()) as Envelope<CheckoutInitiateDto>;
    return {
      userId,
      cookie,
      orderId: body.data.orderId,
      redirectUrl: body.data.redirectUrl,
      product,
    };
  }

  it("404s for an unknown order/authority pair", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/payments/callback?orderId=${new mongoose.Types.ObjectId().toString()}&Authority=nope&Status=OK`,
    );
    expect(res.status).toBe(404);
  });

  it("on Status=OK, verifies, marks the order paid, confirms stock, and clears the cart", async () => {
    const { cookie, orderId, redirectUrl, product } = await initiate();

    // MockPaymentProvider's own redirectUrl already carries a real
    // Authority + Status=OK for this exact payment (see checkout.service.ts).
    const res = await fetch(callbackUrlOnTestServer(redirectUrl));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ orderCode: string; status: string }>;
    expect(body.data.status).toBe("paid");

    const order = await OrderModel.findById(orderId);
    expect(order!.status).toBe("paid");
    expect(order!.statusHistory.map((h) => h.status)).toEqual(["pending", "paid"]);

    const payment = await PaymentModel.findOne({ orderId });
    expect(payment!.status).toBe("success");
    expect(payment!.verifiedAt).toBeTruthy();

    // Reservation resolved (confirmed, not restored) -- stock stays down.
    await expect(StockReservationModel.countDocuments({ refId: orderId })).resolves.toBe(0);
    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct!.stock).toBe(3);
    await expect(
      InventoryMoveModel.countDocuments({
        productId: product._id,
        reason: "reservation-confirmed",
      }),
    ).resolves.toBe(1);

    const cartRes = await fetch(`${baseUrl}/api/v1/cart`, { headers: { cookie } });
    const cartBody = (await cartRes.json()) as Envelope<{ items: unknown[] }>;
    expect(cartBody.data.items).toEqual([]);
  });

  it("is idempotent -- a repeat callback for the same payment doesn't double-process", async () => {
    const { redirectUrl, orderId, product } = await initiate();
    const callbackUrl = callbackUrlOnTestServer(redirectUrl);

    await fetch(callbackUrl);
    const second = await fetch(callbackUrl);
    expect(second.status).toBe(200);
    const body = (await second.json()) as Envelope<{ status: string }>;
    expect(body.data.status).toBe("paid");

    // Confirming reservations twice would be a no-op either way (they're
    // deleted after the first confirm), but the real risk this guards is
    // stock being touched again -- still exactly the one decrement.
    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct!.stock).toBe(3);
    await expect(
      InventoryMoveModel.countDocuments({
        productId: product._id,
        reason: "reservation-confirmed",
      }),
    ).resolves.toBe(1);
    void orderId;
  });

  it("on Status=NOK, cancels the order and releases the reservation without calling verify", async () => {
    const { orderId, product } = await initiate();
    const payment = await PaymentModel.findOne({ orderId });

    const res = await fetch(
      `${baseUrl}/api/v1/payments/callback?orderId=${orderId}&Authority=${payment!.authority}&Status=NOK`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ status: string }>;
    expect(body.data.status).toBe("cancelled");

    const order = await OrderModel.findById(orderId);
    expect(order!.status).toBe("cancelled");

    const updatedPayment = await PaymentModel.findOne({ orderId });
    expect(updatedPayment!.status).toBe("failed");

    // Reservation released -- stock restored to what it was before checkout.
    await expect(StockReservationModel.countDocuments({ refId: orderId })).resolves.toBe(0);
    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct!.stock).toBe(5);
  });
});
