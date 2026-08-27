import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildVehicleKey } from "schemas";
import { disconnectDB, resetDb, startTestServer } from "../../../config/testDb.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { FitmentModel } from "../../models/Fitment.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await Promise.all([
    ProductModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    BrandModel.deleteMany({}),
    FitmentModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  close();
  await disconnectDB();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { nextCursor: string | null; limit: number };
}

async function seedCatalog() {
  const brand = await BrandModel.create({
    name: { fa: "بوش", en: "Bosch" },
    slug: "bosch",
    country: "Germany",
  });
  const category = await CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: "brakes",
    systemCode: "SYS-04",
  });
  return { brand, category };
}

function productInput(overrides: Partial<Product> & Record<string, unknown>) {
  const sku = (overrides.sku as string) ?? `SKU-${randomUUID()}`;
  return {
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه" },
    status: "active",
    stock: 10,
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${sku}`,
    },
    ...overrides,
    sku,
  };
}

function accountCookie(accountType: "retail" | "wholesale"): string {
  const token = signAccessToken({
    sub: randomUUID(),
    role: "customer",
    accountType,
  });
  return `accessToken=${token}`;
}

describe("GET /catalog/products -- wholesale pricing (P6.S1)", () => {
  it("a wholesale account sees the wholesale price and isWholesalePrice: true", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز", en: "Brake pad" },
        slug: "brake-pad",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        wholesalePriceRial: 850_000,
      }),
    );

    const res = await fetch(`${baseUrl}/api/v1/catalog/products`, {
      headers: { cookie: accountCookie("wholesale") },
    });
    const body = (await res.json()) as Envelope<{ priceRial: number; isWholesalePrice: boolean }[]>;
    expect(body.data[0]!.priceRial).toBe(850_000);
    expect(body.data[0]!.isWholesalePrice).toBe(true);
  });

  it("a retail account and a guest both see the retail price and isWholesalePrice: false", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز", en: "Brake pad" },
        slug: "brake-pad",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        wholesalePriceRial: 850_000,
      }),
    );

    const retailRes = await fetch(`${baseUrl}/api/v1/catalog/products`, {
      headers: { cookie: accountCookie("retail") },
    });
    const retailBody = (await retailRes.json()) as Envelope<
      { priceRial: number; isWholesalePrice: boolean }[]
    >;
    expect(retailBody.data[0]!.priceRial).toBe(1_000_000);
    expect(retailBody.data[0]!.isWholesalePrice).toBe(false);

    const guestRes = await fetch(`${baseUrl}/api/v1/catalog/products`);
    const guestBody = (await guestRes.json()) as Envelope<
      { priceRial: number; isWholesalePrice: boolean }[]
    >;
    expect(guestBody.data[0]!.priceRial).toBe(1_000_000);
    expect(guestBody.data[0]!.isWholesalePrice).toBe(false);
  });

  it("never leaks the raw wholesalePriceRial field in the response body, for any viewer", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز", en: "Brake pad" },
        slug: "brake-pad",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        wholesalePriceRial: 850_000,
      }),
    );

    const headerVariants: Record<string, string>[] = [
      { cookie: accountCookie("wholesale") },
      { cookie: accountCookie("retail") },
      {},
    ];
    for (const headers of headerVariants) {
      const listRes = await fetch(`${baseUrl}/api/v1/catalog/products`, { headers });
      expect(await listRes.text()).not.toContain("wholesalePriceRial");

      const detailRes = await fetch(`${baseUrl}/api/v1/catalog/products/brake-pad`, { headers });
      expect(await detailRes.text()).not.toContain("wholesalePriceRial");
    }
  });
});

describe("GET /catalog/products", () => {
  it("pages through results via cursor without skipping or duplicating", async () => {
    const { brand, category } = await seedCatalog();
    for (let i = 1; i <= 5; i += 1) {
      await ProductModel.create(
        productInput({
          name: { fa: `محصول ${i}`, en: `Product ${i}` },
          slug: `product-${i}`,
          brandId: brand._id,
          categoryId: category._id,
          priceRial: i * 100_000,
        }),
      );
    }

    const seen = new Set<string>();
    let cursor: string | null = null;
    for (let page = 0; page < 3; page += 1) {
      const url = new URL(`${baseUrl}/api/v1/catalog/products`);
      url.searchParams.set("sort", "price-asc");
      url.searchParams.set("limit", "2");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Envelope<{ id: string }[]>;
      for (const item of body.data) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
      cursor = body.meta?.nextCursor ?? null;
      if (!cursor) break;
    }
    expect(seen.size).toBe(5);
  });

  it("filters by category slug", async () => {
    const { brand, category } = await seedCatalog();
    const otherCategory = await CategoryModel.create({
      name: { fa: "برق", en: "Electrical" },
      slug: "electrical",
      systemCode: "SYS-05",
    });
    await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز", en: "Brake pad" },
        slug: "brake-pad",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "باتری", en: "Battery" },
        slug: "battery",
        brandId: brand._id,
        categoryId: otherCategory._id,
        priceRial: 2_000_000,
      }),
    );

    const res = await fetch(`${baseUrl}/api/v1/catalog/products?category=brakes`);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["brake-pad"]);
  });

  it("filters by price range", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "ارزان", en: "Cheap" },
        slug: "cheap",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 100_000,
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "گران", en: "Expensive" },
        slug: "expensive",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 5_000_000,
      }),
    );

    const res = await fetch(
      `${baseUrl}/api/v1/catalog/products?minPriceRial=1000000&maxPriceRial=10000000`,
    );
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["expensive"]);
  });

  it("rejects minPriceRial greater than maxPriceRial", async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/products?minPriceRial=100&maxPriceRial=50`);
    expect(res.status).toBe(400);
  });

  it("filters by inStock", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "موجود", en: "In stock" },
        slug: "in-stock",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        stock: 5,
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "ناموجود", en: "Out of stock" },
        slug: "out-of-stock",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        stock: 0,
      }),
    );

    const res = await fetch(`${baseUrl}/api/v1/catalog/products?inStock=true`);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["in-stock"]);
  });

  it("filters by attribute key:value pairs", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "قرمز", en: "Red" },
        slug: "red",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        attributes: [{ key: "color", value: "red" }],
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "آبی", en: "Blue" },
        slug: "blue",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        attributes: [{ key: "color", value: "blue" }],
      }),
    );

    const res = await fetch(`${baseUrl}/api/v1/catalog/products?attributes=color:red`);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["red"]);
  });

  it("filters by fitting vehicle", async () => {
    const { brand, category } = await seedCatalog();
    const fitting = await ProductModel.create(
      productInput({
        name: { fa: "متناسب", en: "Fitting" },
        slug: "fitting",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
      }),
    );
    await ProductModel.create(
      productInput({
        name: { fa: "نامتناسب", en: "Not fitting" },
        slug: "not-fitting",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
      }),
    );
    const makeId = randomUUID();
    const modelId = randomUUID();
    await FitmentModel.create({
      productId: fitting._id,
      makeId,
      modelId,
      yearFrom: 2010,
      yearTo: null,
      confidence: "exact",
    });

    const vehicleKey = buildVehicleKey({
      makeId: makeId.toString(),
      modelId: modelId.toString(),
      genId: randomUUID(),
      year: 2018,
    });
    const res = await fetch(`${baseUrl}/api/v1/catalog/products?vehicle=${vehicleKey}`);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["fitting"]);
  });
});

describe("GET /catalog/products/:slug", () => {
  it("returns an active product by slug", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "لنت ترمز", en: "Brake pad" },
        slug: "brake-pad",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
      }),
    );

    const res = await fetch(`${baseUrl}/api/v1/catalog/products/brake-pad`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{
      slug: string;
      brand: { slug: string } | null;
      category: { slug: string } | null;
    }>;
    expect(body.data.brand?.slug).toBe(brand.slug);
    expect(body.data.category?.slug).toBe(category.slug);
  });

  it("returns 404 for a draft product (not publicly visible)", async () => {
    const { brand, category } = await seedCatalog();
    await ProductModel.create(
      productInput({
        name: { fa: "پیش‌نویس", en: "Draft" },
        slug: "draft-product",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
        status: "draft",
      }),
    );

    const res = await fetch(`${baseUrl}/api/v1/catalog/products/draft-product`);
    expect(res.status).toBe(404);
  });
});

describe("GET /catalog/products/:slug/related", () => {
  it("returns other active products in the same category, excluding itself", async () => {
    const { brand, category } = await seedCatalog();
    const main = await ProductModel.create(
      productInput({
        name: { fa: "اصلی", en: "Main" },
        slug: "main-product",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_000_000,
      }),
    );
    const related = await ProductModel.create(
      productInput({
        name: { fa: "مرتبط", en: "Related" },
        slug: "related-product",
        brandId: brand._id,
        categoryId: category._id,
        priceRial: 1_200_000,
      }),
    );

    const res = await fetch(`${baseUrl}/api/v1/catalog/products/${main.slug}/related`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual([related.slug]);
  });
});
