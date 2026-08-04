import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { CouponModel } from "../../models/Coupon.js";
import { OrderModel } from "../../models/Order.js";
import type { UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";
import { validateCoupon } from "./coupon.service.js";

const TEST_URI = testDbUri("parsian-store-test-coupons-admin-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  // The `code` unique index must be fully built before the duplicate-code
  // test writes twice in quick succession -- P8.S2 hit exactly this flake
  // under the full parallel run and fixed it the same way, not with a sleep.
  await CouponModel.init();
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
  await Promise.all([CouponModel.deleteMany({}), OrderModel.deleteMany({})]);
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

interface CouponBody {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  usedCount: number;
  usageLimit?: number;
  endsAt?: string;
  startsAt?: string;
  minSubtotalRial?: number;
}

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

function jsonHeaders(role?: UserRole): Record<string, string> {
  return { "content-type": "application/json", ...staffCookie(role) };
}

const VALID_CREATE = { code: "SALE10", type: "percent" as const, value: 10 };

async function createViaApi(body: Record<string, unknown>): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/admin/coupons`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

describe("admin coupons routes", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/coupons`);
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in customer", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/coupons`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("creates a coupon, uppercasing the code", async () => {
    const res = await createViaApi({ ...VALID_CREATE, code: "sale10" });
    expect(res.status).toBe(201);

    const body = (await res.json()) as Envelope<CouponBody>;
    expect(body.data.code).toBe("SALE10");
    expect(body.data.usedCount).toBe(0);
  });

  it("returns a clean 400 (not a 500) for a duplicate code", async () => {
    const first = await createViaApi(VALID_CREATE);
    expect(first.status).toBe(201);

    // Lowercase on the wire, so this also proves the duplicate check sees
    // the *normalized* code, not the raw one.
    const second = await createViaApi({ ...VALID_CREATE, code: "sale10" });
    expect(second.status).toBe(400);
  });

  it("rejects a percent coupon over 100 at create time", async () => {
    const res = await createViaApi({ code: "TOOBIG", type: "percent", value: 500 });
    expect(res.status).toBe(400);
  });

  it("allows a fixed coupon with a value over 100 (Rial, not a percentage)", async () => {
    const res = await createViaApi({ code: "FIXED", type: "fixed", value: 500_000 });
    expect(res.status).toBe(201);
  });

  it("rejects an endsAt that precedes startsAt", async () => {
    const res = await createViaApi({
      ...VALID_CREATE,
      code: "BACKWARDS",
      startsAt: "2026-09-01T00:00:00.000Z",
      endsAt: "2026-08-01T00:00:00.000Z",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a PATCH that would push a stored percent coupon over 100", async () => {
    const created = await CouponModel.create({ code: "PCT", type: "percent", value: 10 });

    // The body alone looks fine -- only the merged document is invalid,
    // which is exactly why this rule lives in the service.
    const res = await fetch(`${baseUrl}/api/v1/admin/coupons/${created.id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ value: 500 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a PATCH endsAt that precedes the stored startsAt", async () => {
    const created = await CouponModel.create({
      code: "WINDOW",
      type: "fixed",
      value: 1000,
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    const res = await fetch(`${baseUrl}/api/v1/admin/coupons/${created.id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ endsAt: "2026-08-01T00:00:00.000Z" }),
    });
    expect(res.status).toBe(400);
  });

  it("stores dates as real Dates, not strings", async () => {
    const res = await createViaApi({
      ...VALID_CREATE,
      code: "DATED",
      endsAt: "2030-01-01T00:00:00.000Z",
    });
    expect(res.status).toBe(201);

    const stored = await CouponModel.findOne({ code: "DATED" });
    expect(stored?.endsAt).toBeInstanceOf(Date);
  });

  it("filters the list by active/inactive using the real date window", async () => {
    await CouponModel.create([
      { code: "LIVE", type: "percent", value: 5 },
      { code: "EXPIRED", type: "percent", value: 5, endsAt: new Date("2020-01-01") },
      { code: "FUTURE", type: "percent", value: 5, startsAt: new Date("2090-01-01") },
    ]);

    const activeRes = await fetch(`${baseUrl}/api/v1/admin/coupons?active=true`, {
      headers: staffCookie(),
    });
    const active = (await activeRes.json()) as Envelope<CouponBody[]>;
    expect(active.data.map((c) => c.code)).toEqual(["LIVE"]);

    const inactiveRes = await fetch(`${baseUrl}/api/v1/admin/coupons?active=false`, {
      headers: staffCookie(),
    });
    const inactive = (await inactiveRes.json()) as Envelope<CouponBody[]>;
    expect(inactive.data.map((c) => c.code).sort()).toEqual(["EXPIRED", "FUTURE"]);
  });

  it("counts a fully-redeemed coupon as inactive, not just an expired one", async () => {
    await CouponModel.create({
      code: "USEDUP",
      type: "percent",
      value: 5,
      usageLimit: 2,
      usedCount: 2,
    });

    const res = await fetch(`${baseUrl}/api/v1/admin/coupons?active=true`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<CouponBody[]>;
    expect(body.data).toHaveLength(0);
  });

  it("searches by code prefix, case-insensitively", async () => {
    await CouponModel.create([
      { code: "NOWRUZ99", type: "percent", value: 5 },
      { code: "YALDA10", type: "percent", value: 5 },
    ]);

    const res = await fetch(`${baseUrl}/api/v1/admin/coupons?code=nowruz`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<CouponBody[]>;
    expect(body.data.map((c) => c.code)).toEqual(["NOWRUZ99"]);
  });

  it("treats regex metacharacters in the search as literal text", async () => {
    await CouponModel.create({ code: "SALE10", type: "percent", value: 5 });

    // Unescaped, "S.*" would match SALE10 -- proving the escape works
    // means getting zero results, not a 500.
    const res = await fetch(`${baseUrl}/api/v1/admin/coupons?code=${encodeURIComponent("S.*")}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<CouponBody[]>;
    expect(body.data).toHaveLength(0);
  });

  it("deactivating makes the coupon fail the real validateCoupon check", async () => {
    const created = await CouponModel.create({ code: "KILLME", type: "fixed", value: 1000 });

    // Valid before -- otherwise the assertion after proves nothing.
    const before = await validateCoupon(created, 500_000);
    expect(before).toBeNull();

    const res = await fetch(`${baseUrl}/api/v1/admin/coupons/${created.id}/deactivate`, {
      method: "POST",
      headers: staffCookie(),
    });
    expect(res.status).toBe(200);

    const after = await CouponModel.findById(created.id);
    expect(after).not.toBeNull();
    // Still present and still carrying its history -- deactivation is an
    // endsAt transition, never a soft delete.
    expect(after?.usedCount).toBe(0);
    expect(await validateCoupon(after!, 500_000)).toBe("این کد تخفیف منقضی شده است");
  });

  it("returns 404 for an unknown coupon id", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/admin/coupons/${new mongoose.Types.ObjectId().toString()}`,
      { headers: staffCookie() },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed coupon id", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/coupons/not-an-id`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(400);
  });
});
