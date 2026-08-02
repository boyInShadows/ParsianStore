import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-categories-routes");
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
    CategoryModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    // P8.S4's delete guard counts real products, so a leftover fixture would
    // otherwise make an unrelated delete 409.
    ProductModel.deleteMany({}),
    BrandModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

interface Envelope<T> {
  ok: boolean;
  data: T;
  error?: { message: string };
}

// auditLog() writes on res.on("finish"), after the response has already
// gone out — see middleware/auditLog.test.ts for why this polls instead
// of a fixed sleep (flaky under full-suite load with a fixed delay).
async function waitForAuditEntry(entity: string, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await AuditLogModel.countDocuments({ entity })) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No audit log entry for "${entity}" appeared within ${timeoutMs}ms`);
}

async function seedCategory(overrides: Record<string, unknown> = {}) {
  return CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: "brakes",
    systemCode: "SYS-04",
    ...overrides,
  });
}

describe("GET /catalog/categories", () => {
  it("lists categories and filters by parentId", async () => {
    const parent = await seedCategory();
    await CategoryModel.create({
      name: { fa: "لنت ترمز", en: "Brake pads" },
      slug: "brake-pads",
      parentId: parent._id,
      systemCode: "SYS-04",
      path: [parent.slug],
    });

    const all = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    const allBody = (await all.json()) as Envelope<{ slug: string }[]>;
    expect(allBody.data).toHaveLength(2);

    const filtered = await fetch(
      `${baseUrl}/api/v1/catalog/categories?parentId=${parent._id.toString()}`,
    );
    const filteredBody = (await filtered.json()) as Envelope<{ slug: string }[]>;
    expect(filteredBody.data).toHaveLength(1);
    expect(filteredBody.data[0]!.slug).toBe("brake-pads");
  });
});

describe("GET /catalog/categories/:slug", () => {
  it("returns a category by slug", async () => {
    await seedCategory();
    const res = await fetch(`${baseUrl}/api/v1/catalog/categories/brakes`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ name: { fa: string } }>;
    expect(body.data.name.fa).toBe("ترمز");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/categories/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe("POST/PATCH/DELETE /admin/catalog/categories", () => {
  it("rejects an unauthenticated write", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: { fa: "x", en: "x" },
        slug: "x",
        systemCode: "SYS-01",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({
        name: { fa: "x", en: "x" },
        slug: "x",
        systemCode: "SYS-01",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("creates a category as staff and records an audit log entry", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: { fa: "موتور", en: "Engine" },
        slug: "engine",
        systemCode: "SYS-01",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ slug: string }>;
    expect(body.data.slug).toBe("engine");

    await waitForAuditEntry("category");
    const entries = await AuditLogModel.find({ entity: "category" });
    expect(entries).toHaveLength(1);
  });

  it("rejects a systemCode outside the fixed taxonomy with 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ name: { fa: "x", en: "x" }, slug: "x", systemCode: "SYS-99" }),
    });
    expect(res.status).toBe(400);
  });

  it("computes path from the parent on create", async () => {
    const parent = await seedCategory();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: { fa: "لنت ترمز", en: "Brake pads" },
        slug: "brake-pads",
        parentId: parent._id.toString(),
        systemCode: "SYS-04",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ path: string[] }>;
    expect(body.data.path).toEqual(["brakes"]);
  });

  it("updates a category as staff", async () => {
    const category = await seedCategory();
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ order: 5 }),
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ order: number }>;
    expect(body.data.order).toBe(5);
  });

  it("soft-deletes a category as staff, hiding it from the public list", async () => {
    const category = await seedCategory();
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}`,
      {
        method: "DELETE",
        headers: staffCookie(),
      },
    );
    expect(res.status).toBe(200);

    const listRes = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// P8.S4 — admin reads with derived hierarchy, the delete guard, the
// re-parent/cycle rules, the slug cascade, and restore.
// ---------------------------------------------------------------------------

function productFixture(brandId: string, categoryId: string) {
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
  };
}

async function seedBrandForProduct() {
  return BrandModel.create({
    name: { fa: "بوش", en: "Bosch" },
    slug: `bosch-${Math.floor(Math.random() * 100_000)}`,
    country: "Germany",
  });
}

/** parent → child → grandchild, with real materialized paths. */
async function seedThreeLevels() {
  const parent = await seedCategory({ slug: "engine", name: { fa: "موتور", en: "Engine" } });
  const child = await seedCategory({
    slug: "fuel-system",
    name: { fa: "سیستم سوخت", en: "Fuel system" },
    parentId: parent._id,
    path: [parent.slug],
  });
  const grandchild = await seedCategory({
    slug: "injectors",
    name: { fa: "انژکتور", en: "Injectors" },
    parentId: child._id,
    path: [parent.slug, child.slug],
  });
  return { parent, child, grandchild };
}

describe("GET /admin/catalog/categories", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`);
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("returns admin-only fields the public category DTO omits", async () => {
    await seedCategory({ order: 3, seo: { title: "ترمز" } });
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<
      { systemCode: string; order: number; seo?: { title?: string } }[]
    >;
    expect(body.data[0]?.systemCode).toBe("SYS-04");
    expect(body.data[0]?.order).toBe(3);
    expect(body.data[0]?.seo?.title).toBe("ترمز");
  });

  it("resolves ancestor slugs to real Persian names for a two-level path", async () => {
    await seedThreeLevels();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories?q=injectors`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<
      { depth: number; ancestorNames: string[]; path: string[] }[]
    >;
    expect(body.data[0]?.depth).toBe(2);
    // The stored path is slugs; the admin table needs names.
    expect(body.data[0]?.path).toEqual(["engine", "fuel-system"]);
    expect(body.data[0]?.ancestorNames).toEqual(["موتور", "سیستم سوخت"]);
  });

  it("reports childCount and productCount, excluding soft-deleted rows", async () => {
    const { parent } = await seedThreeLevels();
    const brand = await seedBrandForProduct();
    await ProductModel.create(productFixture(brand.id, parent.id));
    const doomed = await seedCategory({ slug: "gone", parentId: parent._id, path: [parent.slug] });
    await doomed.softDelete();

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories?q=engine`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<{ childCount: number; productCount: number }[]>;
    expect(body.data[0]?.childCount).toBe(1);
    expect(body.data[0]?.productCount).toBe(1);
  });

  it("filters by systemCode and by parentId", async () => {
    const { parent, child } = await seedThreeLevels();
    await seedCategory({ slug: "suspension", systemCode: "SYS-05" });

    const bySystem = await fetch(`${baseUrl}/api/v1/admin/catalog/categories?systemCode=SYS-05`, {
      headers: staffCookie(),
    });
    const systemBody = (await bySystem.json()) as Envelope<{ slug: string }[]>;
    expect(systemBody.data.map((entry) => entry.slug)).toEqual(["suspension"]);

    const byParent = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories?parentId=${parent._id.toString()}`,
      { headers: staffCookie() },
    );
    const parentBody = (await byParent.json()) as Envelope<{ slug: string }[]>;
    expect(parentBody.data.map((entry) => entry.slug)).toEqual([child.slug]);
  });
});

describe("GET /admin/catalog/categories/:id", () => {
  it("404s for a well-formed but unknown id", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${new mongoose.Types.ObjectId().toString()}`,
      { headers: staffCookie() },
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /admin/catalog/categories/:id — referential guard", () => {
  it("refuses to delete a category that still has children", async () => {
    const { parent } = await seedThreeLevels();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${parent._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as Envelope<null>;
    expect(body.error?.message).toContain("زیرمجموعه");
    expect(await CategoryModel.findById(parent._id)).not.toBeNull();
  });

  it("refuses to delete a category that still holds products", async () => {
    const category = await seedCategory();
    const brand = await seedBrandForProduct();
    await ProductModel.create(productFixture(brand.id, category.id));

    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}`,
      { method: "DELETE", headers: staffCookie() },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as Envelope<null>;
    expect(body.error?.message).toContain("محصول");
  });
});

describe("PATCH /admin/catalog/categories/:id — hierarchy rules", () => {
  it("rejects making a category its own parent", async () => {
    const category = await seedCategory();
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ parentId: category._id.toString() }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("rejects re-parenting a category under one of its own descendants", async () => {
    const { parent, grandchild } = await seedThreeLevels();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${parent._id.toString()}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ parentId: grandchild._id.toString() }),
    });
    // The cycle check runs before the has-children check, so this is a 400
    // for the real reason (a cycle) rather than the incidental one.
    expect(res.status).toBe(400);
    expect((await CategoryModel.findById(parent._id))?.parentId).toBeNull();
  });

  it("refuses to re-parent a category that still has children", async () => {
    const { child } = await seedThreeLevels();
    const standalone = await seedCategory({ slug: "standalone" });

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${child._id.toString()}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ parentId: standalone._id.toString() }),
    });
    expect(res.status).toBe(409);
  });

  it("cascades a slug rename into every descendant's materialized path", async () => {
    const { parent, child, grandchild } = await seedThreeLevels();

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${parent._id.toString()}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ slug: "powertrain" }),
    });
    expect(res.status).toBe(200);

    // Without the cascade both of these would still say "engine" and every
    // descendant breadcrumb would point at a slug that no longer resolves.
    expect((await CategoryModel.findById(child._id))?.path).toEqual(["powertrain"]);
    expect((await CategoryModel.findById(grandchild._id))?.path).toEqual([
      "powertrain",
      "fuel-system",
    ]);
  });
});

describe("POST /admin/catalog/categories/:id/restore", () => {
  it("brings a soft-deleted category back and records an audit entry", async () => {
    const category = await seedCategory();
    await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    await AuditLogModel.deleteMany({});

    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories/${category._id.toString()}/restore`,
      { method: "POST", headers: staffCookie() },
    );
    expect(res.status).toBe(200);
    await waitForAuditEntry("category");

    const publicRes = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    const publicBody = (await publicRes.json()) as Envelope<unknown[]>;
    expect(publicBody.data).toHaveLength(1);
  });
});
