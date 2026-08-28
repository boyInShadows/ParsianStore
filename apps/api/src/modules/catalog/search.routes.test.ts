import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct, type ProductOverrides } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  // $text queries (MongoSearchProvider) need the text index actually
  // built — Mongoose's autoIndex runs it asynchronously on connect, so
  // without waiting here the first search test could race a query
  // against an index that isn't ready yet.
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
  meta?: { total: number };
}

/** The searchable product this file's queries expect. `searchText` is derived
 * by the factory, exactly as every real write path derives it -- a product
 * seeded without it is invisible to search, which is a confusing way for a
 * search test to fail. */
async function seedSearchProduct(overrides: ProductOverrides = {}) {
  return seedProduct({
    nameFa: "لنت ترمز جلو",
    nameEn: "Front brake pad",
    slug: "front-brake-pad",
    sku: "SKU-SEARCH-1",
    verificationCode: "VER-SEARCH-1",
    ...overrides,
  });
}

function accountCookie(accountType: "retail" | "wholesale"): string {
  const token = signAccessToken({
    sub: randomUUID(),
    role: "customer",
    accountType,
  });
  return `accessToken=${token}`;
}

describe("GET /catalog/search", () => {
  it("finds a product by a normalized Persian query", async () => {
    const product = await seedSearchProduct();
    const res = await fetch(`${baseUrl}/api/v1/catalog/search?q=${encodeURIComponent("ترمز")}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ id: string }[]>;
    expect(body.data.map((p) => p.id)).toContain(product.id);
  });

  it("browses all active products when q is omitted", async () => {
    await seedSearchProduct();
    const res = await fetch(`${baseUrl}/api/v1/catalog/search`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.meta?.total).toBe(1);
  });

  it("rejects a malformed vehicle key with 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/catalog/search?vehicle=not-a-key`);
    expect(res.status).toBe(400);
  });

  it("P6.S1: resolves the wholesale price for a wholesale account and never leaks the raw field", async () => {
    await seedSearchProduct({ priceRial: 1_500_000, wholesalePriceRial: 1_275_000 });
    const url = `${baseUrl}/api/v1/catalog/search?q=${encodeURIComponent("ترمز")}`;

    const wholesaleRes = await fetch(url, { headers: { cookie: accountCookie("wholesale") } });
    const wholesaleText = await wholesaleRes.text();
    expect(wholesaleText).not.toContain("wholesalePriceRial");
    const wholesaleBody = JSON.parse(wholesaleText) as Envelope<
      { priceRial: number; isWholesalePrice: boolean }[]
    >;
    expect(wholesaleBody.data[0]!.priceRial).toBe(1_275_000);
    expect(wholesaleBody.data[0]!.isWholesalePrice).toBe(true);

    const guestRes = await fetch(url);
    expect(await guestRes.text()).not.toContain("wholesalePriceRial");
  });
});

describe("GET /catalog/facets", () => {
  it("returns category/brand/stock facet counts", async () => {
    await seedSearchProduct();
    const res = await fetch(`${baseUrl}/api/v1/catalog/facets`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{
      categories: unknown[];
      brands: unknown[];
      stock: unknown[];
      attributes: unknown[];
    }>;
    expect(body.data.categories).toHaveLength(1);
    expect(body.data.brands).toHaveLength(1);
  });
});
