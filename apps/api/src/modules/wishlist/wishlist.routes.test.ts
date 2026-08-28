import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import { WishlistModel } from "../../models/Wishlist.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
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
  close();
  await disconnectDB();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

function customerCookie(userId: string): Record<string, string> {
  const token = signAccessToken({ sub: userId, role: "customer", accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

async function seedProduct(overrides: Record<string, unknown> = {}) {
  const brand = await BrandModel.create({
    name: { fa: "بوش", en: "Bosch" },
    slug: `bosch-${randomUUID()}`,
    country: "Germany",
  });
  const category = await CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: `brakes-${randomUUID()}`,
    systemCode: "SYS-04",
  });
  const sku = `SKU-${randomUUID()}`;
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
    const userId = randomUUID();
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
      { productId: string; product: { id: string; isWholesalePrice: boolean } }[]
    >;
    expect(listBody.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]!.productId).toBe(product._id.toString());
    expect(listBody.data[0]!.product.id).toBe(product._id.toString());
    // P7.S3: the list endpoint originally returned the raw Product doc
    // (isWholesalePrice missing, wholesalePriceRial leaked) -- it must go
    // through the same account-aware shaping every other product-serving
    // list uses (pricing.ts's toPublicProductJson).
    expect(listBody.data[0]!.product.isWholesalePrice).toBe(false);
    expect(listBody.data[0]!.product).not.toHaveProperty("wholesalePriceRial");
  });

  it("resolves the wholesale price for a wholesale account, same as the catalog list", async () => {
    const userId = randomUUID();
    const product = await seedProduct({ wholesalePriceRial: 1_200_000 });
    const token = signAccessToken({ sub: userId, role: "customer", accountType: "wholesale" });

    await fetch(`${baseUrl}/api/v1/me/wishlist/${product._id.toString()}`, {
      method: "POST",
      headers: { cookie: `accessToken=${token}` },
    });
    const listRes = await fetch(`${baseUrl}/api/v1/me/wishlist`, {
      headers: { cookie: `accessToken=${token}` },
    });
    const listBody = (await listRes.json()) as Envelope<
      { product: { priceRial: number; isWholesalePrice: boolean } }[]
    >;
    expect(listBody.data[0]!.product.isWholesalePrice).toBe(true);
    expect(listBody.data[0]!.product.priceRial).toBe(1_200_000);
  });

  it("is idempotent on a repeat add — no duplicate entries, no error", async () => {
    const userId = randomUUID();
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
    const userId = randomUUID();
    const res = await fetch(`${baseUrl}/api/v1/me/wishlist/${randomUUID()}`, {
      method: "POST",
      headers: customerCookie(userId),
    });
    expect(res.status).toBe(404);
  });

  it("removes a saved product, and is idempotent when it wasn't saved", async () => {
    const userId = randomUUID();
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
    const userA = randomUUID();
    const userB = randomUUID();
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
