import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CartModel } from "../../models/Cart.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
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

function customerCookie(userId: string): string {
  const token = signAccessToken({ sub: userId, role: "customer" });
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
