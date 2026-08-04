import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { ShippingRateModel } from "../../models/ShippingRate.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { AdminShippingRateDto } from "schemas";

const TEST_URI = testDbUri("parsian-store-test-shipping-admin-routes");
const BASE_PATH = "/api/v1/admin/shipping/rates";
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
  await ShippingRateModel.deleteMany({});
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

interface Body {
  methodCode?: string;
  zone?: string;
  minWeightGram?: number;
  maxWeightGram?: number | null;
  priceRial?: number;
}

const VALID: Body = {
  methodCode: "post-pishtaz",
  zone: "other",
  minWeightGram: 0,
  maxWeightGram: 1000,
  priceRial: 500_000,
};

async function post(body: Body, path = BASE_PATH) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...staffCookie() },
    body: JSON.stringify(body),
  });
}

async function patch(id: string, body: Body) {
  return fetch(`${baseUrl}${BASE_PATH}/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...staffCookie() },
    body: JSON.stringify(body),
  });
}

async function createRate(overrides: Body = {}): Promise<AdminShippingRateDto> {
  const res = await post({ ...VALID, ...overrides });
  const json = (await res.json()) as { data: AdminShippingRateDto };
  return json.data;
}

describe("admin shipping rate routes", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await fetch(`${baseUrl}${BASE_PATH}`);
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in customer", async () => {
    const res = await fetch(`${baseUrl}${BASE_PATH}`, { headers: staffCookie("customer") });
    expect(res.status).toBe(403);
  });

  it("creates a bracket and derives its Persian courier name", async () => {
    const rate = await createRate();

    expect(rate.methodName.fa).toBe("پست پیشتاز");
    expect(rate.priceRial).toBe(500_000);
    expect(rate.deletedAt).toBeNull();
  });

  it("accepts a null max as the open-ended last bracket", async () => {
    const rate = await createRate({ minWeightGram: 1001, maxWeightGram: null });
    expect(rate.maxWeightGram).toBeNull();
  });

  it("rejects a max at or below the min", async () => {
    const res = await post({ ...VALID, minWeightGram: 500, maxWeightGram: 500 });
    expect(res.status).toBe(400);
  });

  it("rejects a non-integer Rial price", async () => {
    const res = await post({ ...VALID, priceRial: 1000.5 });
    expect(res.status).toBe(400);
  });

  it("rejects a negative weight", async () => {
    const res = await post({ ...VALID, minWeightGram: -1 });
    expect(res.status).toBe(400);
  });

  // "پیک درون‌شهری" only serves Tehran (schemas/shipping.ts). A rate saved
  // outside that zone would look configured and never be matched.
  it("refuses a courier/zone pair the courier does not serve", async () => {
    const res = await post({ ...VALID, methodCode: "intracity", zone: "other" });
    expect(res.status).toBe(400);
  });

  it("accepts the same courier in the zone it does serve", async () => {
    const res = await post({ ...VALID, methodCode: "intracity", zone: "tehran" });
    expect(res.status).toBe(201);
  });

  // estimateShipping takes the FIRST matching bracket, so an overlap makes
  // the charged price depend on document order.
  it("refuses a bracket overlapping an existing one", async () => {
    await createRate({ minWeightGram: 0, maxWeightGram: 1000 });

    const res = await post({ ...VALID, minWeightGram: 500, maxWeightGram: 2000 });

    expect(res.status).toBe(409);
  });

  it("refuses a bracket swallowed by an open-ended one", async () => {
    await createRate({ minWeightGram: 0, maxWeightGram: null });

    const res = await post({ ...VALID, minWeightGram: 5000, maxWeightGram: 6000 });

    expect(res.status).toBe(409);
  });

  it("allows an adjacent, non-overlapping bracket", async () => {
    await createRate({ minWeightGram: 0, maxWeightGram: 1000 });

    const res = await post({ ...VALID, minWeightGram: 1001, maxWeightGram: 2000 });

    expect(res.status).toBe(201);
  });

  // The shape seed/shipping.ts already ships. A strict rule here would
  // have made every existing row un-editable the day this screen landed.
  it("allows a bracket that only shares an endpoint with its neighbour", async () => {
    await createRate({ minWeightGram: 0, maxWeightGram: 1000 });

    const res = await post({ ...VALID, minWeightGram: 1000, maxWeightGram: 2000 });

    expect(res.status).toBe(201);
  });

  it("still refuses a bracket that shares more than an endpoint", async () => {
    await createRate({ minWeightGram: 0, maxWeightGram: 1000 });

    const res = await post({ ...VALID, minWeightGram: 999, maxWeightGram: 2000 });

    expect(res.status).toBe(409);
  });

  it("allows the same weight range for a different courier", async () => {
    await createRate({ methodCode: "post-pishtaz" });

    const res = await post({ ...VALID, methodCode: "tipax" });

    expect(res.status).toBe(201);
  });

  it("allows the same weight range in a different zone", async () => {
    await createRate({ zone: "other" });

    const res = await post({ ...VALID, zone: "tehran" });

    expect(res.status).toBe(201);
  });

  it("does not treat a row as overlapping itself on edit", async () => {
    const rate = await createRate();

    const res = await patch(rate.id, { ...VALID, priceRial: 700_000 });

    expect(res.status).toBe(200);
    const stored = await ShippingRateModel.findById(rate.id);
    expect(stored?.priceRial).toBe(700_000);
  });

  it("refuses an edit that would overlap a sibling", async () => {
    await createRate({ minWeightGram: 0, maxWeightGram: 1000 });
    const second = await createRate({ minWeightGram: 1001, maxWeightGram: 2000 });

    const res = await patch(second.id, { ...VALID, minWeightGram: 500, maxWeightGram: 2000 });

    expect(res.status).toBe(409);
  });

  it("soft-deletes and restores a bracket", async () => {
    const rate = await createRate();

    const deleted = await fetch(`${baseUrl}${BASE_PATH}/${rate.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    expect(deleted.status).toBe(200);

    const afterDelete = await fetch(`${baseUrl}${BASE_PATH}`, { headers: staffCookie() });
    const listed = (await afterDelete.json()) as {
      data: AdminShippingRateDto[];
      meta: { total: number };
    };
    expect(listed.data).toHaveLength(0);
    // meta.total must exclude soft-deleted rows too, not just the data array.
    expect(listed.meta.total).toBe(0);

    // 200, not 201: restore returns the existing row, it does not create
    // one -- same contract the catalog restore endpoints already use.
    const restored = await post({}, `${BASE_PATH}/${rate.id}/restore`);
    expect(restored.status).toBe(200);
  });

  // A deleted bracket's range is free; restoring it once another bracket
  // has taken that range would reintroduce the ambiguity.
  it("refuses to restore a bracket whose range was taken over", async () => {
    const rate = await createRate({ minWeightGram: 0, maxWeightGram: 1000 });
    await fetch(`${baseUrl}${BASE_PATH}/${rate.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });
    await createRate({ minWeightGram: 0, maxWeightGram: 1000 });

    const res = await post({}, `${BASE_PATH}/${rate.id}/restore`);

    expect(res.status).toBe(409);
  });

  it("lists deleted brackets under state=deleted", async () => {
    const rate = await createRate();
    await fetch(`${baseUrl}${BASE_PATH}/${rate.id}`, {
      method: "DELETE",
      headers: staffCookie(),
    });

    const res = await fetch(`${baseUrl}${BASE_PATH}?state=deleted`, { headers: staffCookie() });
    const body = (await res.json()) as { data: AdminShippingRateDto[] };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.deletedAt).not.toBeNull();
  });

  it("filters by courier and zone", async () => {
    await createRate({ methodCode: "post-pishtaz", zone: "other" });
    await createRate({ methodCode: "tipax", zone: "tehran" });

    const res = await fetch(`${baseUrl}${BASE_PATH}?methodCode=tipax`, { headers: staffCookie() });
    const body = (await res.json()) as { data: AdminShippingRateDto[] };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.methodCode).toBe("tipax");
  });

  it("returns 404 for an unknown rate id", async () => {
    const res = await fetch(`${baseUrl}${BASE_PATH}/${new mongoose.Types.ObjectId().toString()}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(404);
  });
});
