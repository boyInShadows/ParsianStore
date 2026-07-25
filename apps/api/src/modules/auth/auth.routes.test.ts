import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import argon2 from "argon2";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { OtpTokenModel } from "../../models/OtpToken.js";
import { RefreshTokenModel } from "../../models/RefreshToken.js";
import { UserModel } from "../../models/User.js";

const TEST_URI = testDbUri("parsian-store-test-auth-routes");

// Full HTTP round trip through the real app (ephemeral port + native
// fetch — the same pattern app.test.ts uses, no supertest needed) against
// the real dev/test MongoDB the app itself already connects to.
let server: Server;
let baseUrl: string;

function extractCookie(headers: Headers, name: string): string {
  const setCookies = headers.getSetCookie();
  const match = setCookies.find((c) => c.startsWith(`${name}=`));
  if (!match)
    throw new Error(`Expected a Set-Cookie for "${name}", got: ${setCookies.join(" | ")}`);
  // split(";") on a non-empty string always yields at least one element.
  return match.split(";")[0]!;
}

// requestOtp()'s own behavior (hashing, TTL, single-active-OTP, sms
// provider call) is already covered thoroughly in auth.service.test.ts
// against a real generated code. This helper seeds a known code directly
// so the HTTP-layer tests below can focus on routes/cookies/controller
// wiring without re-deriving a random code from a log line.
async function seedKnownOtp(phone: string, code: string): Promise<void> {
  await OtpTokenModel.deleteMany({ phone });
  await OtpTokenModel.create({
    phone,
    codeHash: await argon2.hash(code),
    expiresAt: new Date(Date.now() + 120_000),
    attempts: 0,
    purpose: "login",
  });
}

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
    UserModel.deleteMany({}),
    OtpTokenModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("POST /auth/otp/request", () => {
  it("rejects a malformed phone number with 400 before touching the OTP flow", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "123" }),
    });
    expect(res.status).toBe(400);
  });

  it("accepts a valid phone and creates a real OTP record end-to-end", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "09121119000" }),
    });
    expect(res.status).toBe(200);

    const otp = await OtpTokenModel.findOne({ phone: "+989121119000" });
    expect(otp).not.toBeNull();
  });
});

describe("auth session flow (verify -> me -> refresh -> logout)", () => {
  it("full flow", async () => {
    const phone = "09121119001";
    await seedKnownOtp("+989121119001", "135790");

    const verifyRes = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, code: "135790" }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyBody = (await verifyRes.json()) as { ok: boolean; data: { phone: string } };
    expect(verifyBody.data.phone).toBe("+989121119001");

    const accessCookie = extractCookie(verifyRes.headers, "accessToken");
    const refreshCookie = extractCookie(verifyRes.headers, "refreshToken");

    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { cookie: accessCookie },
    });
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as { data: { phone: string } };
    expect(meBody.data.phone).toBe("+989121119001");

    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: refreshCookie },
    });
    expect(refreshRes.status).toBe(200);
    const newRefreshCookie = extractCookie(refreshRes.headers, "refreshToken");
    expect(newRefreshCookie).not.toBe(refreshCookie);

    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      headers: { cookie: newRefreshCookie },
    });
    expect(logoutRes.status).toBe(200);

    // The rotated-away original refresh token must not work.
    const reuseOldRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: refreshCookie },
    });
    expect(reuseOldRes.status).toBe(401);

    // Nor does the post-logout (revoked) refresh token.
    const reuseAfterLogoutRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: newRefreshCookie },
    });
    expect(reuseAfterLogoutRes.status).toBe(401);
  });

  it("returns 401 for /me without a session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for /refresh without a refresh cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for /otp/verify with the wrong code", async () => {
    await seedKnownOtp("+989121119002", "246810");
    const res = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "09121119002", code: "000000" }),
    });
    expect(res.status).toBe(400);
  });
});
