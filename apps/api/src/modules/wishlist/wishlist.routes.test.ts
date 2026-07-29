import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import { WishlistModel } from "../../models/Wishlist.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-wishlist-routes");
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
    WishlistModel.deleteMany({}),
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
  meta?: { total: number; page: number; limit: number };
}

function customerCookie(userId: string): Record<string, string> {
  const token = signAccessToken({ sub: userId, role: "customer" });
  return { cookie: `accessToken=${token}` };
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

describe("POST/DELETE/GET /me/wishlist", () => {
  it("rejects every route without a session", async () => {
    const product = await seedProduct();
    const results = await Promise.all([
      fetch(`${baseUrl}/api/v1/me/wishlist`),
      fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, { method: "POST" }),
      fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, { method: "DELETE" }),
    ]);
    for (const res of results) {
      expect(res.status).toBe(401);
    }
  });

  it("saves a product and lists it back, hydrated", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const product = await seedProduct();

    const addRes = await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "POST",
      headers: customerCookie(userId),
    });
    expect(addRes.status).toBe(200);
    const addBody = (await addRes.json()) as Envelope<{ productId: string; isSaved: boolean }>;
    expect(addBody.data).toEqual({ productId: product._id.toString(), isSaved: true });

    const listRes = await fetch(`${baseUrl}/api/v1/me/wishlist`, {
      headers: customerCookie(userId),
    });
    const listBody = (await listRes.json()) as Envelope<
      { productId: string; product: { id: string } }[]
    >;
    expect(listBody.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]!.productId).toBe(product._id.toString());
    expect(listBody.data[0]!.product.id).toBe(product._id.toString());
  });

  it("is idempotent on a repeat add — no duplicate entries, no error", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const product = await seedProduct();
    const cookie = customerCookie(userId);

    await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "POST",
      headers: cookie,
    });
    const secondAdd = await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "POST",
      headers: cookie,
    });
    expect(secondAdd.status).toBe(200);

    const count = await WishlistModel.countDocuments({ userId });
    expect(count).toBe(1);
  });

  it("404s adding a nonexistent product", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(
      `${baseUrl}/api/v1/me/wishlist/${new mongoose.Types.ObjectId().toString()}`,
      { method: "POST", headers: customerCookie(userId) },
    );
    expect(res.status).toBe(404);
  });

  it("removes a saved product, and is idempotent when it wasn't saved", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const product = await seedProduct();
    const cookie = customerCookie(userId);

    await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "POST",
      headers: cookie,
    });
    const removeRes = await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "DELETE",
      headers: cookie,
    });
    expect(removeRes.status).toBe(200);
    expect(await WishlistModel.countDocuments({ userId })).toBe(0);

    const secondRemove = await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "DELETE",
      headers: cookie,
    });
    expect(secondRemove.status).toBe(200);
  });

  it("only ever returns the requesting user's own saved products", async () => {
    const userA = new mongoose.Types.ObjectId().toString();
    const userB = new mongoose.Types.ObjectId().toString();
    const product = await seedProduct();

    await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "POST",
      headers: customerCookie(userA),
    });

    const listRes = await fetch(`${baseUrl}/api/v1/me/wishlist`, {
      headers: customerCookie(userB),
    });
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toEqual([]);
  });
});
