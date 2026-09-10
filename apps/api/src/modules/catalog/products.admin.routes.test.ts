import type { UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct, seedUser } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

// An audit row points at its actor by foreign key now, so the signed token
// has to name a staff account that exists -- otherwise the (fire-and-forget)
// audit write fails silently and every wait-for-audit assertion hangs.
let staffId: string;

beforeEach(async () => {
  await resetDb();
  staffId = (await seedUser({ role: "admin" })).id;
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

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({ sub: staffId, role, accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

async function seedBrandAndCategory() {
  const brand = await prisma.brand.create({
    data: {
      nameFa: "بوش",
      nameEn: "Bosch",
      slug: `bosch-${randomUUID()}`,
      country: "Germany",
    },
  });
  const category = await prisma.category.create({
    data: {
      nameFa: "ترمز",
      nameEn: "Brakes",
      slug: `brakes-${randomUUID()}`,
      systemCode: "SYS_04",
    },
  });
  return { brand, category };
}

/**
 * The *wire* shape a POST body takes: `name: { fa, en }` and a nested
 * `authenticity`, which is what the route's Zod schema validates. The columns
 * behind them are split and flattened, but that stops at storage -- fixtures
 * that write straight to the database go through the shared factory instead
 * of this.
 */
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
    await seedProduct({ brandId: brand.id, categoryId: category.id, status: "draft" });
    await seedProduct({ brandId: brand.id, categoryId: category.id, status: "archived" });

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
    await seedProduct({ brandId: brand.id, categoryId: category.id, status: "active" });
    await seedProduct({ brandId: brand.id, categoryId: category.id, status: "draft" });

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

    // searchText derived explicitly by the service, not left empty the way a
    // write that skipped the old pre("save") hook did (P5.S3's own bug). The
    // derive is a plain function call inside the create transaction now, so
    // this asserts the call is still there rather than that a hook fired.
    const persisted = await prisma.product.findUnique({ where: { id: body.data.id } });
    expect(persisted!.searchText.length).toBeGreaterThan(0);
    // The server-side defaults for the fields the create form omits.
    expect(persisted!.lengthMm).toBe(100);
    expect(persisted!.warrantyMonths).toBe(0);
  });

  it("400s when brandId doesn't exist", async () => {
    const { category } = await seedBrandAndCategory();
    const input = validProductInput(randomUUID(), category.id);

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
    //
    // P8.S4 raised this test's own timeout from the 5s default: the brands,
    // categories and attributes suites now seed real products too (the new
    // delete guards count them), so four separate test databases build
    // Product's index set -- including its $text index -- concurrently
    // against one mongod. `init()` legitimately takes longer now; the wait is
    // still a real wait-for-completion, not a sleep.
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
  }, 30_000);
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
    const persisted = await prisma.product.findUnique({ where: { id: created.id } });
    expect(persisted!.nameFa).toBe("لنت ترمز عقب ویژه");
    expect(persisted!.searchText).toContain("ویژه");
  });

  it("404s for a nonexistent product", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products/${randomUUID()}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ stock: 5 }),
    });
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
    const persisted = await prisma.product.findUnique({ where: { id: created.id } });
    expect(persisted!.status).toBe("archived");
    expect(persisted!.stock).toBe(20);
  });
});
