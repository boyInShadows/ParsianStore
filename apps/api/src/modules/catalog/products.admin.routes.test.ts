import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-products-admin-routes");
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
    ProductModel.deleteMany({}),
    BrandModel.deleteMany({}),
    CategoryModel.deleteMany({}),
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

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

async function seedBrandAndCategory() {
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
  return { brand, category };
}

// Includes dimensions/warranty even though the real POST endpoint's own
// Zod schema strips them (unknown keys, not part of the essential-fields
// create form) -- callers that go straight to ProductModel.create() to
// seed fixtures (bypassing the service, which applies its own defaults)
// still need the model's own required fields satisfied.
function validProductInput(
  brandId: string,
  categoryId: string,
  overrides: Record<string, unknown> = {},
) {
  const suffix = Math.floor(10_000 + Math.random() * 90_000);
  return {
    name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
    slug: `front-brake-pad-${suffix}`,
    sku: `SKU-${suffix}`,
    brandId,
    categoryId,
    priceRial: 1_500_000,
    taxRate: 9,
    stock: 20,
    weightGram: 800,
    dimensions: { lengthMm: 100, widthMm: 100, heightMm: 100 },
    warranty: { months: 12, text: "۱۲ ماه ضمانت" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${suffix}`,
    },
    ...overrides,
  };
}

describe("GET /admin/catalog/products", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products`);
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("lists products across every status, including draft and archived", async () => {
    const { brand, category } = await seedBrandAndCategory();
    await ProductModel.create({
      ...validProductInput(brand.id, category.id),
      status: "draft",
    });
    await ProductModel.create({
      ...validProductInput(brand.id, category.id),
      status: "archived",
    });

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ status: string }[]>;
    expect(body.meta?.total).toBe(2);
    expect(body.data.map((p) => p.status).sort()).toEqual(["archived", "draft"]);
  });

  it("filters by status", async () => {
    const { brand, category } = await seedBrandAndCategory();
    await ProductModel.create({ ...validProductInput(brand.id, category.id), status: "active" });
    await ProductModel.create({ ...validProductInput(brand.id, category.id), status: "draft" });

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products?status=active`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<{ status: string }[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.status).toBe("active");
  });
});

describe("POST /admin/catalog/products", () => {
  it("creates a product with real searchText computed (not empty)", async () => {
    const { brand, category } = await seedBrandAndCategory();
    const input = validProductInput(brand.id, category.id);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify(input),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ id: string; slug: string; status: string }>;
    expect(body.data.slug).toBe(input.slug);
    expect(body.data.status).toBe("draft");

    // real searchText computed via .create()'s pre("save") hook, not left
    // empty the way a raw findOneAndUpdate upsert would (P5.S3's own bug)
    const persisted = await ProductModel.findById(body.data.id);
    expect(persisted!.searchText.length).toBeGreaterThan(0);
    expect(persisted!.dimensions).toEqual({ lengthMm: 100, widthMm: 100, heightMm: 100 });
  });

  it("400s when brandId doesn't exist", async () => {
    const { category } = await seedBrandAndCategory();
    const input = validProductInput(new mongoose.Types.ObjectId().toString(), category.id);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify(input),
    });
    expect(res.status).toBe(400);
  });

  it("400s on a duplicate slug", async () => {
    // Mongoose builds indexes asynchronously on first use -- under full-suite
    // parallel load, the unique index on a freshly-touched collection can
    // still be mid-build when the second rapid-fire create below fires,
    // letting a real duplicate slip through undetected. `ProductModel.init()`
    // resolves only once index building is actually done (a real,
    // reproducible flake under `pnpm test`'s full parallel run, not present
    // when this file runs alone -- confirmed, not assumed).
    await ProductModel.init();
    const { brand, category } = await seedBrandAndCategory();
    const input = validProductInput(brand.id, category.id);
    await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify(input),
    });
    const second = await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ ...input, sku: "SKU-DIFFERENT" }),
    });
    expect(second.status).toBe(400);
  });
});

describe("PATCH /admin/catalog/products/:id", () => {
  it("updates a product and recomputes searchText when name changes", async () => {
    const { brand, category } = await seedBrandAndCategory();
    const createRes = await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify(validProductInput(brand.id, category.id)),
    });
    const created = ((await createRes.json()) as Envelope<{ id: string }>).data;

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ name: { fa: "لنت ترمز عقب ویژه", en: "Special rear brake pad" } }),
    });
    expect(res.status).toBe(200);
    const persisted = await ProductModel.findById(created.id);
    expect(persisted!.name.fa).toBe("لنت ترمز عقب ویژه");
    expect(persisted!.searchText).toContain("ویژه");
  });

  it("404s for a nonexistent product", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/products/${new mongoose.Types.ObjectId()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ stock: 5 }),
      },
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /admin/catalog/products/:id/archive", () => {
  it("sets status to archived without touching other fields", async () => {
    const { brand, category } = await seedBrandAndCategory();
    const createRes = await fetch(`${baseUrl}/api/v1/admin/catalog/products`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify(validProductInput(brand.id, category.id, { status: "active" })),
    });
    const created = ((await createRes.json()) as Envelope<{ id: string }>).data;

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products/${created.id}/archive`, {
      method: "POST",
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const persisted = await ProductModel.findById(created.id);
    expect(persisted!.status).toBe("archived");
    expect(persisted!.stock).toBe(20);
  });
});
