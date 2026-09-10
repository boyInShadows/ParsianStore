import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildVehicleKey } from "schemas";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct, seedVehicleTree, type ProductOverrides } from "../../test/factories.js";
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
  meta?: { nextCursor: string | null; limit: number };
}

async function seedCatalog() {
  const brand = await prisma.brand.create({
    data: {
      nameFa: "بوش",
      nameEn: "Bosch",
      slug: "bosch",
      country: "Germany",
    },
  });
  const category = await prisma.category.create({
    data: {
      nameFa: "ترمز",
      nameEn: "Brakes",
      slug: "brakes",
      systemCode: "SYS_04",
    },
  });
  return { brand, category };
}

/**
 * A live product row. The shared factory owns the required-column payload;
 * this only keeps the defaults this file's assertions depend on.
 */
/**
 * An attribute value is a row pointing at a real Attribute now, not a
 * `{key, value}` pair embedded on the product -- so a fixture has to define
 * the attribute before it can give a product a value for it.
 */
async function attachAttribute(productId: string, key: string, value: string) {
  const attribute = await prisma.attribute.upsert({
    where: { key },
    create: { key, name: key, type: "select", options: [value] },
    update: { options: { push: value } },
  });
  await prisma.productAttributeValue.create({
    data: { productId, attributeId: attribute.id, value },
  });
}

async function seedProductRow(overrides: ProductOverrides) {
  return seedProduct({ weightGram: 800, stock: 10, status: "active", ...overrides });
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
    await seedProductRow({
      nameFa: "لنت ترمز",
      nameEn: "Brake pad",
      slug: "brake-pad",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
      wholesalePriceRial: 850_000,
    });

    const res = await fetch(`${baseUrl}/api/v1/catalog/products`, {
      headers: { cookie: accountCookie("wholesale") },
    });
    const body = (await res.json()) as Envelope<{ priceRial: number; isWholesalePrice: boolean }[]>;
    expect(body.data[0]!.priceRial).toBe(850_000);
    expect(body.data[0]!.isWholesalePrice).toBe(true);
  });

  it("a retail account and a guest both see the retail price and isWholesalePrice: false", async () => {
    const { brand, category } = await seedCatalog();
    await seedProductRow({
      nameFa: "لنت ترمز",
      nameEn: "Brake pad",
      slug: "brake-pad",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
      wholesalePriceRial: 850_000,
    });

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
    await seedProductRow({
      nameFa: "لنت ترمز",
      nameEn: "Brake pad",
      slug: "brake-pad",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
      wholesalePriceRial: 850_000,
    });

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
      await seedProductRow({
        nameFa: `محصول ${i}`,
        nameEn: `Product ${i}`,
        slug: `product-${i}`,
        brandId: brand.id,
        categoryId: category.id,
        priceRial: i * 100_000,
      });
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
    const otherCategory = await prisma.category.create({
      data: {
        nameFa: "برق",
        nameEn: "Electrical",
        slug: "electrical",
        systemCode: "SYS_05",
      },
    });
    await seedProductRow({
      nameFa: "لنت ترمز",
      nameEn: "Brake pad",
      slug: "brake-pad",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });
    await seedProductRow({
      nameFa: "باتری",
      nameEn: "Battery",
      slug: "battery",
      brandId: brand.id,
      categoryId: otherCategory.id,
      priceRial: 2_000_000,
    });

    const res = await fetch(`${baseUrl}/api/v1/catalog/products?category=brakes`);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["brake-pad"]);
  });

  // P12.S9. The landing page's missing-photo plate draws the part's own system,
  // and a product row only carries a categoryId -- the code lives on Category.
  it("sends each product's system code, in wire form, resolved from its category", async () => {
    const { brand, category } = await seedCatalog();
    const electrical = await prisma.category.create({
      data: { nameFa: "برق", nameEn: "Electrical", slug: "electrical", systemCode: "SYS_05" },
    });
    await seedProductRow({
      nameFa: "لنت ترمز",
      nameEn: "Brake pad",
      slug: "brake-pad",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });
    await seedProductRow({
      nameFa: "باتری",
      nameEn: "Battery",
      slug: "battery",
      brandId: brand.id,
      categoryId: electrical.id,
      priceRial: 2_000_000,
    });

    const res = await fetch(`${baseUrl}/api/v1/catalog/products`);
    const body = (await res.json()) as Envelope<{ slug: string; systemCode?: string }[]>;
    const bySlug = new Map(body.data.map((product) => [product.slug, product.systemCode]));

    // Hyphens, not the underscores Prisma's enum members are spelled with:
    // an identifier cannot hold a hyphen, so the column is `SYS_05 @map("SYS-05")`
    // and every other wire shape in this app uses the mapped form.
    expect(bySlug.get("battery")).toBe("SYS-05");
    expect(bySlug.get("brake-pad")).toBe("SYS-04");
  });

  it("filters by price range", async () => {
    const { brand, category } = await seedCatalog();
    await seedProductRow({
      nameFa: "ارزان",
      nameEn: "Cheap",
      slug: "cheap",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 100_000,
    });
    await seedProductRow({
      nameFa: "گران",
      nameEn: "Expensive",
      slug: "expensive",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 5_000_000,
    });

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
    await seedProductRow({
      nameFa: "موجود",
      nameEn: "In stock",
      slug: "in-stock",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
      stock: 5,
    });
    await seedProductRow({
      nameFa: "ناموجود",
      nameEn: "Out of stock",
      slug: "out-of-stock",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
      stock: 0,
    });

    const res = await fetch(`${baseUrl}/api/v1/catalog/products?inStock=true`);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["in-stock"]);
  });

  it("filters by attribute key:value pairs", async () => {
    const { brand, category } = await seedCatalog();
    const red = await seedProductRow({
      nameFa: "قرمز",
      nameEn: "Red",
      slug: "red",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });
    await attachAttribute(red.id, "color", "red");
    const blue = await seedProductRow({
      nameFa: "آبی",
      nameEn: "Blue",
      slug: "blue",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });
    await attachAttribute(blue.id, "color", "blue");

    const res = await fetch(`${baseUrl}/api/v1/catalog/products?attributes=color:red`);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual(["red"]);
  });

  it("filters by fitting vehicle", async () => {
    const { brand, category } = await seedCatalog();
    const fitting = await seedProductRow({
      nameFa: "متناسب",
      nameEn: "Fitting",
      slug: "fitting",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });
    await seedProductRow({
      nameFa: "نامتناسب",
      nameEn: "Not fitting",
      slug: "not-fitting",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });
    // A real vehicle branch: a fitment's make/model/generation are foreign
    // keys now, where the Mongo fixture could name ids nothing had to match.
    const { make, model, gen } = await seedVehicleTree();
    await prisma.fitment.create({
      data: {
        productId: fitting.id,
        makeId: make.id,
        modelId: model.id,
        yearFrom: 2010,
        yearTo: null,
        confidence: "exact",
      },
    });

    const vehicleKey = buildVehicleKey({
      makeId: make.id,
      modelId: model.id,
      genId: gen.id,
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
    await seedProductRow({
      nameFa: "لنت ترمز",
      nameEn: "Brake pad",
      slug: "brake-pad",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });

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
    await seedProductRow({
      nameFa: "پیش‌نویس",
      nameEn: "Draft",
      slug: "draft-product",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
      status: "draft",
    });

    const res = await fetch(`${baseUrl}/api/v1/catalog/products/draft-product`);
    expect(res.status).toBe(404);
  });
});

describe("GET /catalog/products/:slug/related", () => {
  it("returns other active products in the same category, excluding itself", async () => {
    const { brand, category } = await seedCatalog();
    const main = await seedProductRow({
      nameFa: "اصلی",
      nameEn: "Main",
      slug: "main-product",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_000_000,
    });
    const related = await seedProductRow({
      nameFa: "مرتبط",
      nameEn: "Related",
      slug: "related-product",
      brandId: brand.id,
      categoryId: category.id,
      priceRial: 1_200_000,
    });

    const res = await fetch(`${baseUrl}/api/v1/catalog/products/${main.slug}/related`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((p) => p.slug)).toEqual([related.slug]);
  });
});
