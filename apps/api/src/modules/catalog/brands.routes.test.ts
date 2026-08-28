import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await Promise.all([
    BrandModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    // P8.S4's delete guard counts real products, so they have to be cleared
    // between tests too or a leftover fixture makes an unrelated delete 409.
    ProductModel.deleteMany({}),
    CategoryModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  close();
  await disconnectDB();
});

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: randomUUID(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

interface Envelope<T> {
  ok: boolean;
  data: T;
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

async function seedBrand() {
  return BrandModel.create({ name: { fa: "بوش", en: "Bosch" }, slug: "bosch", country: "Germany" });
}

describe("GET /catalog/brands", () => {
  it("lists brands with pagination meta", async () => {
    await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/catalog/brands`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /catalog/brands/:slug", () => {
  it("returns a brand by slug", async () => {
    await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/catalog/brands/bosch`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ country: string }>;
    expect(body.data.country).toBe("Germany");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/brands/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe("POST/PATCH/DELETE /admin/catalog/brands", () => {
  it("rejects a non-staff role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({ name: { fa: "x", en: "x" }, slug: "x", country: "Iran" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates a brand as staff and records an audit log entry", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: { fa: "والئو", en: "Valeo" },
        slug: "valeo",
        country: "France",
        isOEM: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ isOEM: boolean }>;
    expect(body.data.isOEM).toBe(true);

    await waitForAuditEntry("brand");
    const entries = await AuditLogModel.find({ entity: "brand" });
    expect(entries).toHaveLength(1);
  });

  it("updates a brand as staff", async () => {
    const brand = await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ description: "قطعات آلمانی با کیفیت" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ description: string }>;
    expect(body.data.description).toBe("قطعات آلمانی با کیفیت");
  });

  it("soft-deletes a brand as staff, hiding it from the public list", async () => {
    const brand = await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);

    const listRes = await fetch(`${baseUrl}/api/v1/catalog/brands`);
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// P8.S4 — the admin reads, the referential delete guard, and restore.
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

async function seedCategoryForProduct() {
  return CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: `brakes-${Math.floor(Math.random() * 100_000)}`,
    systemCode: "SYS-04",
  });
}

describe("GET /admin/catalog/brands", () => {
  it("rejects with no session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`);
    expect(res.status).toBe(401);
  });

  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("returns admin-only fields the public brand DTO omits", async () => {
    await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`, { headers: staffCookie() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<
      { country: string; isOEM: boolean; productCount: number; deletedAt: string | null }[]
    >;
    expect(body.data[0]?.country).toBe("Germany");
    expect(body.data[0]?.isOEM).toBe(false);
    expect(body.data[0]?.productCount).toBe(0);
    expect(body.data[0]?.deletedAt).toBeNull();
  });

  it("reports a real productCount per brand", async () => {
    const brand = await seedBrand();
    const category = await seedCategoryForProduct();
    await ProductModel.create(productFixture(brand.id, category.id));
    await ProductModel.create(productFixture(brand.id, category.id));

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands`, { headers: staffCookie() });
    const body = (await res.json()) as Envelope<{ productCount: number }[]>;
    expect(body.data[0]?.productCount).toBe(2);
  });

  it("matches a leading fragment of the name, not only a whole word", async () => {
    await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands?q=Bos`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.data.map((brand) => brand.slug)).toEqual(["bosch"]);
  });

  it("treats a regex metacharacter in q as a literal, not a pattern", async () => {
    await seedBrand();
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/brands?q=${encodeURIComponent("bo.*")}`,
      { headers: staffCookie() },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toHaveLength(0);
  });

  it("filters by isOEM without coercing the string false to true", async () => {
    await seedBrand();
    await BrandModel.create({
      name: { fa: "والئو", en: "Valeo" },
      slug: "valeo",
      country: "France",
      isOEM: true,
    });

    const oemRes = await fetch(`${baseUrl}/api/v1/admin/catalog/brands?isOEM=true`, {
      headers: staffCookie(),
    });
    const oemBody = (await oemRes.json()) as Envelope<{ slug: string }[]>;
    expect(oemBody.data.map((brand) => brand.slug)).toEqual(["valeo"]);

    const retailRes = await fetch(`${baseUrl}/api/v1/admin/catalog/brands?isOEM=false`, {
      headers: staffCookie(),
    });
    const retailBody = (await retailRes.json()) as Envelope<{ slug: string }[]>;
    expect(retailBody.data.map((brand) => brand.slug)).toEqual(["bosch"]);
  });
});

describe("GET /admin/catalog/brands/:id", () => {
  it("returns one brand", async () => {
    const brand = await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ slug: string }>;
    expect(body.data.slug).toBe("bosch");
  });

  it("404s for a well-formed but unknown id", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${randomUUID()}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /admin/catalog/brands/:id — referential guard", () => {
  it("refuses to delete a brand products still reference, and leaves it live", async () => {
    const brand = await seedBrand();
    const category = await seedCategoryForProduct();
    await ProductModel.create(productFixture(brand.id, category.id));

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { message: string } };
    // The count itself, in Persian digits — staff should see how much work
    // the refusal implies, not just that it failed.
    expect(body.error.message).toContain("۱");
    expect(body.error.message).toContain("محصول");

    // The refusal must not half-apply.
    expect(await BrandModel.findById(brand._id)).not.toBeNull();
  });

  it("still refuses when the only referencing product is archived", async () => {
    const brand = await seedBrand();
    const category = await seedCategoryForProduct();
    await ProductModel.create({ ...productFixture(brand.id, category.id), status: "archived" });

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(409);
  });

  it("deletes a brand nothing references", async () => {
    const brand = await seedBrand();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /admin/catalog/brands/:id/restore", () => {
  it("brings a soft-deleted brand back into both the admin and public lists", async () => {
    const brand = await seedBrand();
    await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });

    const deletedRes = await fetch(`${baseUrl}/api/v1/admin/catalog/brands?state=deleted`, {
      headers: staffCookie(),
    });
    const deletedBody = (await deletedRes.json()) as Envelope<{ slug: string }[]>;
    expect(deletedBody.data.map((entry) => entry.slug)).toEqual(["bosch"]);

    const restoreRes = await fetch(
      `${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}/restore`,
      { method: "POST", headers: staffCookie() },
    );
    expect(restoreRes.status).toBe(200);

    const publicRes = await fetch(`${baseUrl}/api/v1/catalog/brands`);
    const publicBody = (await publicRes.json()) as Envelope<unknown[]>;
    expect(publicBody.data).toHaveLength(1);
  });
});

// Regression for the P8.S4 models/plugins.ts fix: `countDocuments` was not
// covered by the soft-delete hook, so every paginated endpoint's meta.total
// counted rows its own `data` array had already excluded.
describe("meta.total after a soft delete", () => {
  it("excludes a soft-deleted brand from meta.total, not just from data", async () => {
    const brand = await seedBrand();
    await BrandModel.create({
      name: { fa: "والئو", en: "Valeo" },
      slug: "valeo",
      country: "France",
    });
    await fetch(`${baseUrl}/api/v1/admin/catalog/brands/${brand._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });

    const res = await fetch(`${baseUrl}/api/v1/catalog/brands`);
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } };
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });
});
