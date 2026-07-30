import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CartModel } from "../../models/Cart.js";
import { CategoryModel } from "../../models/Category.js";
import { CityModel } from "../../models/City.js";
import { CouponModel } from "../../models/Coupon.js";
import { OrderModel } from "../../models/Order.js";
import { ProductModel } from "../../models/Product.js";
import { ProvinceModel } from "../../models/Province.js";
import { ShippingRateModel } from "../../models/ShippingRate.js";
import { UserModel } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-cart-routes");
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
    CouponModel.deleteMany({}),
    OrderModel.deleteMany({}),
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

interface CartItemDto {
  id: string;
  productId: string;
  qty: number;
  availableQty: number;
  stockOk: boolean;
  lineTotalRial: number;
  product: { id: string };
}

interface CartDto {
  id: string;
  items: CartItemDto[];
  subtotalRial: number;
  totalRial: number;
}

function extractCookie(headers: Headers, name: string): string {
  const setCookies = headers.getSetCookie();
  const match = setCookies.find((c) => c.startsWith(`${name}=`));
  if (!match)
    throw new Error(`Expected a Set-Cookie for "${name}", got: ${setCookies.join(" | ")}`);
  return match.split(";")[0]!;
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

describe("GET /cart (guest)", () => {
  it("creates a fresh empty cart and sets an anonId cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/cart`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<CartDto>;
    expect(body.data.items).toEqual([]);
    expect(body.data.subtotalRial).toBe(0);
    expect(extractCookie(res.headers, "anonId")).toMatch(/^anonId=.+/);
  });
});

describe("POST/PATCH/DELETE /cart/items (guest)", () => {
  it("adds an item, mints an anonId cookie, and the same guest sees it persist", async () => {
    const product = await seedProduct();

    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 2 }),
    });
    expect(addRes.status).toBe(200);
    const anonCookie = extractCookie(addRes.headers, "anonId");
    const addBody = (await addRes.json()) as Envelope<CartDto>;
    expect(addBody.data.items).toHaveLength(1);
    expect(addBody.data.items[0]!.qty).toBe(2);
    expect(addBody.data.subtotalRial).toBe(3_000_000);

    const getRes = await fetch(`${baseUrl}/api/v1/cart`, { headers: { cookie: anonCookie } });
    const getBody = (await getRes.json()) as Envelope<CartDto>;
    expect(getBody.data.items).toHaveLength(1);
    expect(getBody.data.items[0]!.qty).toBe(2);
  });

  it("adding the same product again increments qty instead of duplicating the line", async () => {
    const product = await seedProduct();
    const first = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(first.headers, "anonId");

    const second = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: anonCookie },
      body: JSON.stringify({ productId: product._id.toString(), qty: 3 }),
    });
    const body = (await second.json()) as Envelope<CartDto>;
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]!.qty).toBe(4);
  });

  it("404s adding a nonexistent product", async () => {
    const res = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: new mongoose.Types.ObjectId().toString(), qty: 1 }),
    });
    expect(res.status).toBe(404);
  });

  it("updates and removes a line item", async () => {
    const product = await seedProduct();
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");
    const addBody = (await addRes.json()) as Envelope<CartDto>;
    const itemId = addBody.data.items[0]!.id;

    const patchRes = await fetch(`${baseUrl}/api/v1/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: anonCookie },
      body: JSON.stringify({ qty: 5 }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = (await patchRes.json()) as Envelope<CartDto>;
    expect(patchBody.data.items[0]!.qty).toBe(5);

    const deleteRes = await fetch(`${baseUrl}/api/v1/cart/items/${itemId}`, {
      method: "DELETE",
      headers: { cookie: anonCookie },
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = (await deleteRes.json()) as Envelope<CartDto>;
    expect(deleteBody.data.items).toEqual([]);
  });

  it("404s updating a nonexistent item id", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/cart/items/${new mongoose.Types.ObjectId().toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qty: 2 }),
      },
    );
    expect(res.status).toBe(404);
  });

  it("surfaces a live stock issue without mutating the stored qty", async () => {
    const product = await seedProduct({ stock: 2, backorderable: false });
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 5 }),
    });
    const body = (await addRes.json()) as Envelope<CartDto>;
    expect(body.data.items[0]!.qty).toBe(5);
    expect(body.data.items[0]!.stockOk).toBe(false);
    expect(body.data.items[0]!.availableQty).toBe(2);
  });
});

describe("guest -> auth cart merge", () => {
  it("merges the guest cart into the user's cart on the first authenticated GET /cart, then clears anonId", async () => {
    const product = await seedProduct();
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 2 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");
    const anonId = anonCookie.split("=")[1]!;

    const userId = new mongoose.Types.ObjectId().toString();
    const mergedRes = await fetch(`${baseUrl}/api/v1/cart`, {
      headers: { cookie: `${anonCookie}; ${customerCookie(userId)}` },
    });
    expect(mergedRes.status).toBe(200);
    const mergedBody = (await mergedRes.json()) as Envelope<CartDto>;
    expect(mergedBody.data.items).toHaveLength(1);
    expect(mergedBody.data.items[0]!.qty).toBe(2);

    expect(await CartModel.exists({ anonId })).toBeNull();
    expect(await CartModel.exists({ userId })).not.toBeNull();
  });

  it("sums quantities when the user already had the same product in their own cart", async () => {
    const product = await seedProduct();
    const userId = new mongoose.Types.ObjectId().toString();
    const userCookie = customerCookie(userId);

    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: userCookie },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });

    const guestAddRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 3 }),
    });
    const anonCookie = extractCookie(guestAddRes.headers, "anonId");

    const mergedRes = await fetch(`${baseUrl}/api/v1/cart`, {
      headers: { cookie: `${anonCookie}; ${userCookie}` },
    });
    const mergedBody = (await mergedRes.json()) as Envelope<CartDto>;
    expect(mergedBody.data.items).toHaveLength(1);
    expect(mergedBody.data.items[0]!.qty).toBe(4);
  });
});

interface WholesaleCartItemDto extends CartItemDto {
  priceRialSnapshot: number;
  product: { id: string; priceRial: number; isWholesalePrice: boolean };
}

describe("P6.S1: wholesale pricing in the cart", () => {
  it("a wholesale account's addItem/getCart resolve the wholesale price, snapshotted and re-read consistently", async () => {
    const product = await seedProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    const userId = new mongoose.Types.ObjectId().toString();
    const wholesaleCookie = customerCookie(userId, "wholesale");

    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: wholesaleCookie },
      body: JSON.stringify({ productId: product._id.toString(), qty: 2 }),
    });
    const addBody = (await addRes.json()) as Envelope<{ items: WholesaleCartItemDto[] }>;
    const item = addBody.data.items[0]!;
    expect(item.priceRialSnapshot).toBe(850_000);
    expect(item.product.priceRial).toBe(850_000);
    expect(item.product.isWholesalePrice).toBe(true);
    expect(item.lineTotalRial).toBe(1_700_000);

    const getRes = await fetch(`${baseUrl}/api/v1/cart`, {
      headers: { cookie: wholesaleCookie },
    });
    const getBody = (await getRes.json()) as Envelope<{ items: WholesaleCartItemDto[] }>;
    expect(getBody.data.items[0]!.product.priceRial).toBe(850_000);
    // Wholesale price didn't change since add-time, so no drift flag.
    expect((getBody.data.items[0] as unknown as { priceChanged: boolean }).priceChanged).toBe(
      false,
    );
  });

  it("a guest and a retail account both see the retail price for the same product", async () => {
    const product = await seedProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });

    const guestRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const guestBody = (await guestRes.json()) as Envelope<{ items: WholesaleCartItemDto[] }>;
    expect(guestBody.data.items[0]!.product.priceRial).toBe(1_000_000);
    expect(guestBody.data.items[0]!.product.isWholesalePrice).toBe(false);

    const retailUserId = new mongoose.Types.ObjectId().toString();
    const retailRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: customerCookie(retailUserId, "retail"),
      },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const retailBody = (await retailRes.json()) as Envelope<{ items: WholesaleCartItemDto[] }>;
    expect(retailBody.data.items[0]!.product.priceRial).toBe(1_000_000);
    expect(retailBody.data.items[0]!.product.isWholesalePrice).toBe(false);
  });

  it("never leaks the raw wholesalePriceRial field in the cart response, for any viewer", async () => {
    const product = await seedProduct({ priceRial: 1_000_000, wholesalePriceRial: 850_000 });
    const userId = new mongoose.Types.ObjectId().toString();

    const res = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: customerCookie(userId, "wholesale") },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    expect(await res.text()).not.toContain("wholesalePriceRial");
  });
});

interface ShippingOptionDto {
  methodCode: string;
  name: { fa: string; en: string };
  priceRial: number;
}

interface EstimateShippingDto {
  totalWeightGram: number;
  options: ShippingOptionDto[];
}

async function seedGeo() {
  const tehran = await ProvinceModel.create({
    name: { fa: "تهران", en: "Tehran" },
    slug: "tehran",
  });
  const fars = await ProvinceModel.create({ name: { fa: "فارس", en: "Fars" }, slug: "fars" });
  const tehranCity = await CityModel.create({
    provinceId: tehran._id,
    name: { fa: "تهران", en: "Tehran" },
    slug: "tehran-city",
  });
  const shiraz = await CityModel.create({
    provinceId: fars._id,
    name: { fa: "شیراز", en: "Shiraz" },
    slug: "shiraz",
  });
  return { tehran, fars, tehranCity, shiraz };
}

async function seedShippingRates() {
  await ShippingRateModel.insertMany([
    {
      methodCode: "post-pishtaz",
      zone: "tehran",
      minWeightGram: 0,
      maxWeightGram: 1000,
      priceRial: 250_000,
    },
    {
      methodCode: "post-pishtaz",
      zone: "tehran",
      minWeightGram: 1000,
      maxWeightGram: null,
      priceRial: 400_000,
    },
    {
      methodCode: "post-pishtaz",
      zone: "other",
      minWeightGram: 0,
      maxWeightGram: 1000,
      priceRial: 350_000,
    },
    {
      methodCode: "post-pishtaz",
      zone: "other",
      minWeightGram: 1000,
      maxWeightGram: null,
      priceRial: 550_000,
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

async function createUserWithAddress(
  provinceId: string,
  cityId: string,
): Promise<{ userId: string; addressId: string; cookie: string }> {
  const user = await UserModel.create({
    phone: `+989${Math.floor(100000000 + Math.random() * 800000000)}`,
    name: "Checkout Test User",
  });
  const userId = user.id as string;
  const cookie = customerCookie(userId);

  const res = await fetch(`${baseUrl}/api/v1/me/addresses`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      provinceId,
      cityId,
      line: "خیابان آزادی",
      postalCode: "1234567890",
      receiverName: "کاربر تست",
      receiverPhone: "09121234567",
    }),
  });
  const body = (await res.json()) as Envelope<{ id: string }>;
  return { userId, addressId: body.data.id, cookie };
}

describe("POST /cart/estimate-shipping", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/cart/estimate-shipping`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addressId: new mongoose.Types.ObjectId().toString() }),
    });
    expect(res.status).toBe(401);
  });

  it("includes intracity for a Tehran address and picks the right weight bracket", async () => {
    const { tehran, tehranCity } = await seedGeo();
    await seedShippingRates();
    const product = await seedProduct({ weightGram: 500 });
    const { addressId, cookie } = await createUserWithAddress(
      tehran._id.toString(),
      tehranCity._id.toString(),
    );

    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });

    const res = await fetch(`${baseUrl}/api/v1/cart/estimate-shipping`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<EstimateShippingDto>;
    expect(body.data.totalWeightGram).toBe(500);
    const codes = body.data.options.map((o) => o.methodCode);
    expect(codes).toContain("intracity");
    const postPishtaz = body.data.options.find((o) => o.methodCode === "post-pishtaz");
    expect(postPishtaz?.priceRial).toBe(250_000); // 500g falls in the 0-1000g Tehran bracket
  });

  it("excludes intracity for a non-Tehran address and uses the 'other' zone rate", async () => {
    const { fars, shiraz } = await seedGeo();
    await seedShippingRates();
    const product = await seedProduct({ weightGram: 1500 });
    const { addressId, cookie } = await createUserWithAddress(
      fars._id.toString(),
      shiraz._id.toString(),
    );

    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });

    const res = await fetch(`${baseUrl}/api/v1/cart/estimate-shipping`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId }),
    });
    const body = (await res.json()) as Envelope<EstimateShippingDto>;
    const codes = body.data.options.map((o) => o.methodCode);
    expect(codes).not.toContain("intracity");
    const postPishtaz = body.data.options.find((o) => o.methodCode === "post-pishtaz");
    expect(postPishtaz?.priceRial).toBe(550_000); // 1500g falls in the 1000g+ "other" bracket
  });

  it("400s for an empty cart", async () => {
    const { tehran, tehranCity } = await seedGeo();
    await seedShippingRates();
    const { addressId, cookie } = await createUserWithAddress(
      tehran._id.toString(),
      tehranCity._id.toString(),
    );

    const res = await fetch(`${baseUrl}/api/v1/cart/estimate-shipping`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId }),
    });
    expect(res.status).toBe(400);
  });

  it("400s for an address that belongs to a different user", async () => {
    const { tehran, tehranCity } = await seedGeo();
    await seedShippingRates();
    const product = await seedProduct({ weightGram: 500 });
    const owner = await createUserWithAddress(tehran._id.toString(), tehranCity._id.toString());
    const strangerUser = await UserModel.create({
      phone: `+989${Math.floor(100000000 + Math.random() * 800000000)}`,
      name: "Stranger",
    });
    const strangerCookie = customerCookie(strangerUser.id as string);

    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { cookie: strangerCookie, "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });

    const res = await fetch(`${baseUrl}/api/v1/cart/estimate-shipping`, {
      method: "POST",
      headers: { cookie: strangerCookie, "content-type": "application/json" },
      body: JSON.stringify({ addressId: owner.addressId }),
    });
    expect(res.status).toBe(400);
  });
});

interface CouponCartDto {
  subtotalRial: number;
  discountRial: number;
  totalRial: number;
  couponCode?: string;
  couponIssue?: string;
}

describe("POST/DELETE /cart/coupon", () => {
  it("404s for an unknown code", async () => {
    const product = await seedProduct({ priceRial: 1_000_000 });
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");

    const res = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie: anonCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "NOPE" }),
    });
    expect(res.status).toBe(404);
  });

  it("400s when the cart subtotal is below the coupon's minSubtotalRial", async () => {
    await CouponModel.create({
      code: "BIGONLY",
      type: "fixed",
      value: 100_000,
      minSubtotalRial: 5_000_000,
    });
    const product = await seedProduct({ priceRial: 1_000_000 });
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");

    const res = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie: anonCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "bigonly" }),
    });
    expect(res.status).toBe(400);
  });

  it("400s for an expired coupon", async () => {
    await CouponModel.create({
      code: "OLD10",
      type: "percent",
      value: 10,
      endsAt: new Date(Date.now() - 86_400_000),
    });
    const product = await seedProduct({ priceRial: 1_000_000 });
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");

    const res = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie: anonCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "OLD10" }),
    });
    expect(res.status).toBe(400);
  });

  it("applies a percent coupon (case-insensitive), caps it at maxDiscountRial, and DELETE removes it", async () => {
    await CouponModel.create({
      code: "SAVE10",
      type: "percent",
      value: 10,
      maxDiscountRial: 50_000,
    });
    const product = await seedProduct({ priceRial: 1_000_000 });
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");

    // 10% of 1,000,000 = 100,000, but capped at maxDiscountRial 50,000.
    const applyRes = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie: anonCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "save10" }),
    });
    expect(applyRes.status).toBe(200);
    const applyBody = (await applyRes.json()) as Envelope<CouponCartDto>;
    expect(applyBody.data.couponCode).toBe("SAVE10");
    expect(applyBody.data.discountRial).toBe(50_000);
    expect(applyBody.data.totalRial).toBe(950_000);

    const removeRes = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "DELETE",
      headers: { cookie: anonCookie },
    });
    const removeBody = (await removeRes.json()) as Envelope<CouponCartDto>;
    expect(removeBody.data.couponCode).toBeUndefined();
    expect(removeBody.data.discountRial).toBe(0);
    expect(removeBody.data.totalRial).toBe(1_000_000);
  });

  it("a fixed coupon never discounts past the subtotal itself", async () => {
    await CouponModel.create({ code: "HUGE", type: "fixed", value: 5_000_000 });
    const product = await seedProduct({ priceRial: 200_000 });
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");

    const res = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie: anonCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "HUGE" }),
    });
    const body = (await res.json()) as Envelope<CouponCartDto>;
    expect(body.data.discountRial).toBe(200_000);
    expect(body.data.totalRial).toBe(0);
  });

  it("400s once usageLimit is exhausted", async () => {
    await CouponModel.create({
      code: "ONEUSE",
      type: "fixed",
      value: 10_000,
      usageLimit: 1,
      usedCount: 1,
    });
    const product = await seedProduct({ priceRial: 1_000_000 });
    const addRes = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });
    const anonCookie = extractCookie(addRes.headers, "anonId");

    const res = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie: anonCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "ONEUSE" }),
    });
    expect(res.status).toBe(400);
  });

  it("400s once a signed-in user has already redeemed perUserLimit times", async () => {
    await CouponModel.create({ code: "ONCE", type: "fixed", value: 10_000, perUserLimit: 1 });
    const user = await UserModel.create({
      phone: `+989${Math.floor(100000000 + Math.random() * 800000000)}`,
      name: "Repeat Shopper",
    });
    // A prior real (paid) order that already redeemed this code.
    await OrderModel.create({
      code: "PS-1404-00001",
      userId: user._id,
      items: [],
      subtotalRial: 1_000_000,
      discountRial: 10_000,
      couponCode: "ONCE",
      shippingRial: 0,
      taxRial: 0,
      totalRial: 990_000,
      address: {
        province: { fa: "تهران", en: "Tehran" },
        city: { fa: "تهران", en: "Tehran" },
        line: "x",
        postalCode: "1234567890",
        receiverName: "x",
        receiverPhone: "09121234567",
      },
      shippingMethod: { code: "intracity", name: { fa: "پیک", en: "Courier" }, priceRial: 0 },
      status: "paid",
      statusHistory: [{ status: "paid", at: new Date() }],
    });

    const cookie = customerCookie(user.id as string);
    const product = await seedProduct({ priceRial: 1_000_000 });
    await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ productId: product._id.toString(), qty: 1 }),
    });

    const res = await fetch(`${baseUrl}/api/v1/cart/coupon`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "ONCE" }),
    });
    expect(res.status).toBe(400);
  });
});
