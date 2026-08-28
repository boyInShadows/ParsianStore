import type { UserRole } from "@prisma/client";
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

describe("GET /admin/catalog/attributes", () => {
  it("rejects an unauthenticated request (no public attributes route exists)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`);
    expect(res.status).toBe(401);
  });

  it("lists attributes for staff", async () => {
    await prisma.attribute.create({
      data: { name: "رنگ", key: "color", type: "select", options: ["قرمز"] },
    });
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.data).toHaveLength(1);
  });
});

describe("POST/PATCH/DELETE /admin/catalog/attributes", () => {
  it("rejects a customer role with 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie("customer") },
      body: JSON.stringify({ name: "رنگ", key: "color", type: "select" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates an attribute as staff and records an audit log entry", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        name: "رنگ",
        key: "color",
        type: "select",
        options: ["قرمز", "آبی"],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Envelope<{ key: string }>;
    expect(body.data.key).toBe("color");

    await waitForAuditEntry("attribute");
    const entries = await prisma.auditLog.findMany({ where: { entity: "attribute" } });
    expect(entries).toHaveLength(1);
  });

  it("rejects a key that doesn't start with a lowercase letter", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ name: "x", key: "1bad", type: "text" }),
    });
    expect(res.status).toBe(400);
  });

  it("updates and soft-deletes an attribute as staff", async () => {
    const attribute = await prisma.attribute.create({
      data: { name: "وزن", key: "weight", type: "number" },
    });

    const updateRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ unit: "kg" }),
    });
    expect(updateRes.status).toBe(200);
    const updateBody = (await updateRes.json()) as Envelope<{ unit: string }>;
    expect(updateBody.data.unit).toBe("kg");

    const deleteRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(deleteRes.status).toBe(200);

    const listRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      headers: staffCookie(),
    });
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// P8.S4 — usage counts, the delete/rename guards, restore, and the newly
// wired product↔attribute link. Before this step nothing in the codebase
// ever wrote Product.attributes[], so none of this could be exercised at all.
// ---------------------------------------------------------------------------

async function seedColorAttribute() {
  return prisma.attribute.create({
    data: {
      name: "رنگ",
      key: "color",
      type: "select",
      options: ["قرمز", "آبی"],
    },
  });
}

async function seedProductWithAttribute(pairs: { key: string; value: string }[]) {
  const product = await seedProduct();
  if (pairs.length === 0) return product;
  // An attribute value is a row pointing at a real Attribute now, not a
  // `{key, value}` pair embedded on the product -- which is the whole reason
  // a typo can no longer create a phantom facet bucket.
  const defined = await prisma.attribute.findMany({
    where: { key: { in: pairs.map((pair) => pair.key) } },
    select: { id: true, key: true },
  });
  const idByKey = new Map(defined.map((attribute) => [attribute.key, attribute.id]));
  await prisma.productAttributeValue.createMany({
    data: pairs.map((pair) => ({
      productId: product.id,
      attributeId: idByKey.get(pair.key)!,
      value: pair.value,
    })),
  });
  return product;
}

describe("attribute usage counts and guards", () => {
  it("reports usageCount from real Product.attributes[] entries", async () => {
    await seedColorAttribute();
    await seedProductWithAttribute([{ key: "color", value: "قرمز" }]);
    await seedProductWithAttribute([{ key: "color", value: "آبی" }]);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<{ key: string; usageCount: number }[]>;
    expect(body.data[0]?.usageCount).toBe(2);
  });

  it("refuses to delete an attribute products still use", async () => {
    const attribute = await seedColorAttribute();
    await seedProductWithAttribute([{ key: "color", value: "قرمز" }]);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(res.status).toBe(409);
    expect(await prisma.attribute.findUnique({ where: { id: attribute.id } })).not.toBeNull();
  });

  it("refuses to rename the key of an attribute products still use", async () => {
    const attribute = await seedColorAttribute();
    await seedProductWithAttribute([{ key: "color", value: "قرمز" }]);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ key: "colour" }),
    });
    expect(res.status).toBe(409);
    // Renaming the display name is still allowed — only the machine key is
    // load-bearing for products.
    const nameRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ name: "رنگ بدنه" }),
    });
    expect(nameRes.status).toBe(200);
  });

  it("restores a soft-deleted attribute", async () => {
    const attribute = await seedColorAttribute();
    await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });

    const deletedRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes?state=deleted`, {
      headers: staffCookie(),
    });
    const deletedBody = (await deletedRes.json()) as Envelope<{ key: string }[]>;
    expect(deletedBody.data.map((entry) => entry.key)).toEqual(["color"]);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}/restore`, {
      method: "POST",
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);

    const listRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      headers: staffCookie(),
    });
    const listBody = (await listRes.json()) as Envelope<unknown[]>;
    expect(listBody.data).toHaveLength(1);
  });
});

describe("attribute shape rules", () => {
  it("rejects a select attribute with no options — it could never be assigned", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ name: "رنگ", key: "color", type: "select", options: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("re-checks the select/options rule against the merged document on update", async () => {
    // A PATCH body of `{options: []}` alone cannot answer this — it is invalid
    // only because the STORED attribute is a select.
    const attribute = await seedColorAttribute();
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ options: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("filters by q and by type", async () => {
    await seedColorAttribute();
    await prisma.attribute.create({
      data: { name: "طول", key: "length", type: "number", unit: "mm" },
    });

    const byType = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes?type=number`, {
      headers: staffCookie(),
    });
    const typeBody = (await byType.json()) as Envelope<{ key: string }[]>;
    expect(typeBody.data.map((entry) => entry.key)).toEqual(["length"]);

    const byQ = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes?q=col`, {
      headers: staffCookie(),
    });
    const qBody = (await byQ.json()) as Envelope<{ key: string }[]>;
    expect(qBody.data.map((entry) => entry.key)).toEqual(["color"]);
  });
});

describe("product attributes validated against the dictionary", () => {
  it("stores a valid key/value pair through the admin product endpoint", async () => {
    await seedColorAttribute();
    const product = await seedProductWithAttribute([]);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ attributes: [{ key: "color", value: "قرمز" }] }),
    });
    expect(res.status).toBe(200);
    // Read back through the join: the value row carries the attribute id, and
    // the human key lives on the dictionary row it points at.
    const stored = await prisma.productAttributeValue.findMany({
      where: { productId: product.id },
      include: { attribute: { select: { key: true } } },
    });
    expect(stored.map((pair) => ({ key: pair.attribute.key, value: pair.value }))).toEqual([
      { key: "color", value: "قرمز" },
    ]);
  });

  it("rejects a key that no attribute defines", async () => {
    await seedColorAttribute();
    const product = await seedProductWithAttribute([]);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ attributes: [{ key: "made_up", value: "x" }] }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a value outside a select attribute's own options", async () => {
    await seedColorAttribute();
    const product = await seedProductWithAttribute([]);

    // A typo here would otherwise create a one-off PLP facet bucket that no
    // attribute definition can ever label.
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ attributes: [{ key: "color", value: "سبز" }] }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects the same key twice on one product", async () => {
    await seedColorAttribute();
    const product = await seedProductWithAttribute([]);

    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({
        attributes: [
          { key: "color", value: "قرمز" },
          { key: "color", value: "آبی" },
        ],
      }),
    });
    expect(res.status).toBe(400);
  });
});
