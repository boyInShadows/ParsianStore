import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { AttributeModel } from "../../models/Attribute.js";
import { AuditLogModel } from "../../models/AuditLog.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-attributes-routes");
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
    AttributeModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    // P8.S4: usage counts and the delete/rename guards read real products.
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

describe("GET /admin/catalog/attributes", () => {
  it("rejects an unauthenticated request (no public attributes route exists)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes`);
    expect(res.status).toBe(401);
  });

  it("lists attributes for staff", async () => {
    await AttributeModel.create({ name: "رنگ", key: "color", type: "select", options: ["قرمز"] });
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
    const entries = await AuditLogModel.find({ entity: "attribute" });
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
    const attribute = await AttributeModel.create({ name: "وزن", key: "weight", type: "number" });

    const updateRes = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ unit: "kg" }),
      },
    );
    expect(updateRes.status).toBe(200);
    const updateBody = (await updateRes.json()) as Envelope<{ unit: string }>;
    expect(updateBody.data.unit).toBe("kg");

    const deleteRes = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      { method: "DELETE", headers: staffCookie() },
    );
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
  return AttributeModel.create({
    name: "رنگ",
    key: "color",
    type: "select",
    options: ["قرمز", "آبی"],
  });
}

async function seedProductWithAttribute(pairs: { key: string; value: string }[]) {
  const suffix = Math.floor(10_000 + Math.random() * 90_000);
  const brand = await BrandModel.create({
    name: { fa: "بوش", en: "Bosch" },
    slug: `bosch-${suffix}`,
    country: "Germany",
  });
  const category = await CategoryModel.create({
    name: { fa: "ترمز", en: "Brakes" },
    slug: `brakes-${suffix}`,
    systemCode: "SYS-04",
  });
  return ProductModel.create({
    name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
    slug: `front-brake-pad-${suffix}`,
    sku: `SKU-${suffix}`,
    brandId: brand.id,
    categoryId: category.id,
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
    attributes: pairs,
  });
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

    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      { method: "DELETE", headers: staffCookie() },
    );
    expect(res.status).toBe(409);
    expect(await AttributeModel.findById(attribute._id)).not.toBeNull();
  });

  it("refuses to rename the key of an attribute products still use", async () => {
    const attribute = await seedColorAttribute();
    await seedProductWithAttribute([{ key: "color", value: "قرمز" }]);

    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ key: "colour" }),
      },
    );
    expect(res.status).toBe(409);
    // Renaming the display name is still allowed — only the machine key is
    // load-bearing for products.
    const nameRes = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ name: "رنگ بدنه" }),
      },
    );
    expect(nameRes.status).toBe(200);
  });

  it("restores a soft-deleted attribute", async () => {
    const attribute = await seedColorAttribute();
    await fetch(`${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`, {
      method: "DELETE",
      headers: staffCookie(),
    });

    const deletedRes = await fetch(`${baseUrl}/api/v1/admin/catalog/attributes?state=deleted`, {
      headers: staffCookie(),
    });
    const deletedBody = (await deletedRes.json()) as Envelope<{ key: string }[]>;
    expect(deletedBody.data.map((entry) => entry.key)).toEqual(["color"]);

    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}/restore`,
      { method: "POST", headers: staffCookie() },
    );
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
    const res = await fetch(
      `${baseUrl}/api/v1/admin/catalog/attributes/${attribute._id.toString()}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...staffCookie() },
        body: JSON.stringify({ options: [] }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("filters by q and by type", async () => {
    await seedColorAttribute();
    await AttributeModel.create({ name: "طول", key: "length", type: "number", unit: "mm" });

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
    // Mapped rather than compared whole: attributes[] is a subdocument array,
    // so each entry also carries its own _id.
    const stored = (await ProductModel.findById(product.id))?.attributes ?? [];
    expect(stored.map((pair) => ({ key: pair.key, value: pair.value }))).toEqual([
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
