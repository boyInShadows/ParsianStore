import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import argon2 from "argon2";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";

// Full HTTP round trip through the real app (ephemeral port + native
// fetch — the same pattern app.test.ts uses, no supertest needed) against
// the same PostgreSQL database the app itself connects to.
let baseUrl: string;
let close: () => void;

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
  await prisma.otpToken.deleteMany({ where: { phone } });
  await prisma.otpToken.create({
    data: {
      phone,
      codeHash: await argon2.hash(code),
      expiresAt: new Date(Date.now() + 120_000),
      attempts: 0,
      purpose: "login",
    },
  });
}

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  close();
  await disconnectDB();
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

    const otp = await prisma.otpToken.findFirst({ where: { phone: "+989121119000" } });
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

    const profileRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: "PATCH",
      headers: { cookie: accessCookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "کاربر پارسیان", email: "shopper@example.com" }),
    });
    expect(profileRes.status).toBe(200);
    const profileBody = (await profileRes.json()) as {
      data: { name: string; email?: string; phone: string };
    };
    expect(profileBody.data).toMatchObject({
      name: "کاربر پارسیان",
      email: "shopper@example.com",
      phone: "+989121119001",
    });
    const updatedUser = await prisma.user.findUnique({ where: { phone: "+989121119001" } });
    expect(updatedUser?.name).toBe("کاربر پارسیان");
    expect(updatedUser?.email).toBe("shopper@example.com");

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

  it("answers /me without a session cookie as 200 with a null user", async () => {
    // Not 401. The web client asks on every page load and cannot check first --
    // the session is in httpOnly cookies, invisible to JavaScript -- so a 401
    // here wrote a failed request into the console of every anonymous visit.
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: null });
  });

  it("still answers /me with a null user when the session cookie is junk", async () => {
    // `optionalAuth` swallows a bad token and proceeds as a guest, so a stale
    // or tampered cookie must read as signed out rather than as an error.
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { cookie: "accessToken=not-a-jwt" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: null });
  });

  it("validates profile updates and protects them with the session", async () => {
    const unauthorized = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "نام معتبر" }),
    });
    expect(unauthorized.status).toBe(401);
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

/**
 * P8.S6. `authRateLimiter` used to be mounted with `authRouter.use(...)`,
 * which also covered `GET /me`. The (admin) layout reads /me server-side
 * on every page render, so the eleventh admin page view inside fifteen
 * minutes 429'd and bounced a properly-signed-in staff member to the login
 * screen. These two tests pin the split: credential endpoints stay
 * limited, the session read does not.
 */
describe("auth rate limiting covers credentials, not the session read", () => {
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it("does not rate limit repeated /me reads", async () => {
    env.NODE_ENV = "production";
    const statuses: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`);
      statuses.push(res.status);
    }
    // 200 with a null user is the expected answer here -- what must never
    // appear is 429.
    expect(statuses).not.toContain(429);
  });

  it("still rate limits repeated OTP requests from one IP", async () => {
    env.NODE_ENV = "production";
    let blocked = false;
    for (let i = 0; i < 12; i += 1) {
      const res = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // A different phone each time, so this can only be the per-IP
        // limiter and never the per-phone one.
        body: JSON.stringify({ phone: `0912555${String(1000 + i)}` }),
      });
      if (res.status === 429) blocked = true;
    }
    expect(blocked).toBe(true);
  });
});
