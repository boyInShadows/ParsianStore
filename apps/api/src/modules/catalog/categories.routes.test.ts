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

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({ sub: staffId, role, accountType: "retail" });
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
    if ((await prisma.auditLog.count({ where: { entity } })) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No audit log entry for "${entity}" appeared within ${timeoutMs}ms`);
}

async function seedCategory(overrides: Record<string, unknown> = {}) {
  return prisma.category.create({
    data: {
      nameFa: "ترمز",
      nameEn: "Brakes",
      slug: "brakes",
      systemCode: "SYS_04",
      ...overrides,
    },
  });
}

describe("GET /catalog/categories", () => {
  it("lists categories and filters by parentId", async () => {
    const parent = await seedCategory();
    await prisma.category.create({
      data: {
        nameFa: "لنت ترمز",
        nameEn: "Brake pads",
        slug: "brake-pads",
        parentId: parent.id,
        systemCode: "SYS_04",
        path: [parent.slug],
      },
    });

    const all = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    const allBody = (await all.json()) as Envelope<{ slug: string }[]>;
    expect(allBody.data).toHaveLength(2);

    const filtered = await fetch(`${baseUrl}/api/v1/catalog/categories?parentId=${parent.id}`);
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
    const entries = await prisma.auditLog.findMany({ where: { entity: "category" } });
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
        parentId: parent.id,
        systemCode: "SYS-04",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ path: string[] }>;
    expect(body.data.path).toEqual(["brakes"]);
  });

  it("updates a category as staff", async () => {
    const category = await seedCategory();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${category.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ order: 5 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ order: number }>;
    expect(body.data.order).toBe(5);
  });

  it("soft-deletes a category as staff, hiding it from the public list", async () => {
    const category = await seedCategory();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${category.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
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

/** A product in a given category -- the shared factory fills in every column
 * the schema requires and this file does not care about. */
async function seedProductIn(categoryId: string) {
  return seedProduct({ categoryId });
}

async function seedBrandForProduct() {
  return prisma.brand.create({
    data: {
      nameFa: "بوش",
      nameEn: "Bosch",
      slug: `bosch-${Math.floor(Math.random() * 100_000)}`,
      country: "Germany",
    },
  });
}

/** parent → child → grandchild, with real materialized paths. */
async function seedThreeLevels() {
  const parent = await seedCategory({ slug: "engine", nameFa: "موتور", nameEn: "Engine" });
  const child = await seedCategory({
    slug: "fuel-system",
    nameFa: "سیستم سوخت",
    nameEn: "Fuel system",
    parentId: parent.id,
    path: [parent.slug],
  });
  const grandchild = await seedCategory({
    slug: "injectors",
    nameFa: "انژکتور",
    nameEn: "Injectors",
    parentId: child.id,
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
    await seedCategory({ order: 3, seoTitle: "ترمز" });
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
    await seedBrandForProduct();
    await seedProductIn(parent.id);
    const doomed = await seedCategory({ slug: "gone", parentId: parent.id, path: [parent.slug] });
    await prisma.category.update({ where: { id: doomed.id }, data: { deletedAt: new Date() } });

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories?q=engine`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<{ childCount: number; productCount: number }[]>;
    expect(body.data[0]?.childCount).toBe(1);
    expect(body.data[0]?.productCount).toBe(1);
  });

  it("filters by systemCode and by parentId", async () => {
    const { parent, child } = await seedThreeLevels();
    await seedCategory({ slug: "suspension", systemCode: "SYS_05" });

    const bySystem = await fetch(`${baseUrl}/api/v1/admin/catalog/categories?systemCode=SYS-05`, {
      headers: staffCookie(),
    });
    const systemBody = (await bySystem.json()) as Envelope<{ slug: string }[]>;
    expect(systemBody.data.map((entry) => entry.slug)).toEqual(["suspension"]);

    const byParent = await fetch(
      `${baseUrl}/api/v1/admin/catalog/categories?parentId=${parent.id}`,
      { headers: staffCookie() },
    );
    const parentBody = (await byParent.json()) as Envelope<{ slug: string }[]>;
    expect(parentBody.data.map((entry) => entry.slug)).toEqual([child.slug]);
  });
});

describe("GET /admin/catalog/categories/:id", () => {
  it("404s for a well-formed but unknown id", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${randomUUID()}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /admin/catalog/categories/:id — referential guard", () => {
  it("refuses to delete a category that still has children", async () => {
    const { parent } = await seedThreeLevels();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${parent.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as Envelope<null>;
    expect(body.error?.message).toContain("زیرمجموعه");
    expect(await prisma.category.findUnique({ where: { id: parent.id } })).not.toBeNull();
  });

  it("refuses to delete a category that still holds products", async () => {
    const category = await seedCategory();
    await seedBrandForProduct();
    await seedProductIn(category.id);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${category.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as Envelope<null>;
    expect(body.error?.message).toContain("محصول");
  });
});

describe("PATCH /admin/catalog/categories/:id — hierarchy rules", () => {
  it("rejects making a category its own parent", async () => {
    const category = await seedCategory();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${category.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ parentId: category.id }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects re-parenting a category under one of its own descendants", async () => {
    const { parent, grandchild } = await seedThreeLevels();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${parent.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ parentId: grandchild.id }),
    });
    // The cycle check runs before the has-children check, so this is a 400
    // for the real reason (a cycle) rather than the incidental one.
    expect(res.status).toBe(400);
    expect((await prisma.category.findUnique({ where: { id: parent.id } }))?.parentId).toBeNull();
  });

  it("refuses to re-parent a category that still has children", async () => {
    const { child } = await seedThreeLevels();
    const standalone = await seedCategory({ slug: "standalone" });

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${child.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ parentId: standalone.id }),
    });
    expect(res.status).toBe(409);
  });

  it("cascades a slug rename into every descendant's materialized path", async () => {
    const { parent, child, grandchild } = await seedThreeLevels();

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${parent.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ slug: "powertrain" }),
    });
    expect(res.status).toBe(200);

    // Without the cascade both of these would still say "engine" and every
    // descendant breadcrumb would point at a slug that no longer resolves.
    expect((await prisma.category.findUnique({ where: { id: child.id } }))?.path).toEqual([
      "powertrain",
    ]);
    expect((await prisma.category.findUnique({ where: { id: grandchild.id } }))?.path).toEqual([
      "powertrain",
      "fuel-system",
    ]);
  });
});

describe("POST /admin/catalog/categories/:id/restore", () => {
  it("brings a soft-deleted category back and records an audit entry", async () => {
    const category = await seedCategory();
    await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${category.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    await prisma.auditLog.deleteMany();

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/categories/${category.id}/restore`, {
      method: "POST",
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    await waitForAuditEntry("category");

    const publicRes = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    const publicBody = (await publicRes.json()) as Envelope<unknown[]>;
    expect(publicBody.data).toHaveLength(1);
  });
});
