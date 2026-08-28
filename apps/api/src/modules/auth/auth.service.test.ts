import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import type { SmsProvider } from "../../providers/sms/index.js";
import * as authService from "./auth.service.js";

// Captures the OTP code the service actually generated, since it's random
// — a real integration test needs the real code to drive verifyOtp(),
// not a value invented separately from what the service produced.
function spyProvider(): { provider: SmsProvider; sentCodes: string[] } {
  const sentCodes: string[] = [];
  return {
    sentCodes,
    provider: {
      sendOtp: (_phone, code) => {
        sentCodes.push(code);
        return Promise.resolve();
      },
    },
  };
}

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("requestOtp + verifyOtp", () => {
  it("auto-creates a new User on first successful verification", async () => {
    const { provider, sentCodes } = spyProvider();
    await authService.requestOtp("09121110001", provider);

    const session = await authService.verifyOtp("09121110001", sentCodes[0]!);
    expect(session.user.phone).toBe("+989121110001");
    expect(session.user.role).toBe("customer");
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const stored = await prisma.user.findUnique({ where: { phone: "+989121110001" } });
    expect(stored).not.toBeNull();
    expect(stored?.lastLoginAt).toBeInstanceOf(Date);
  });

  it("logs an existing User in rather than creating a duplicate", async () => {
    await prisma.user.create({ data: { phone: "+989121110002", name: "Existing" } });

    const { provider, sentCodes } = spyProvider();
    await authService.requestOtp("09121110002", provider);
    await authService.verifyOtp("09121110002", sentCodes[0]!);

    const count = await prisma.user.count({ where: { phone: "+989121110002" } });
    expect(count).toBe(1);
  });

  it("consumes the OTP — the same code cannot be used twice", async () => {
    const { provider, sentCodes } = spyProvider();
    await authService.requestOtp("09121110003", provider);
    await authService.verifyOtp("09121110003", sentCodes[0]!);

    await expect(authService.verifyOtp("09121110003", sentCodes[0]!)).rejects.toThrow();
  });

  it("rejects a wrong code and increments the attempt counter", async () => {
    const { provider } = spyProvider();
    await authService.requestOtp("09121110004", provider);

    await expect(authService.verifyOtp("09121110004", "000000")).rejects.toThrow();

    const otp = await prisma.otpToken.findFirst({ where: { phone: "+989121110004" } });
    expect(otp?.attempts).toBe(1);
  });

  it("locks out after 5 wrong attempts, even before the TTL expires", async () => {
    const { provider } = spyProvider();
    await authService.requestOtp("09121110005", provider);

    for (let i = 0; i < 5; i++) {
      await expect(authService.verifyOtp("09121110005", "000000")).rejects.toThrow();
    }

    await expect(authService.verifyOtp("09121110005", "000000")).rejects.toThrow(/تعداد تلاش/);
  });

  it("rejects a code once its TTL has passed", async () => {
    const { provider, sentCodes } = spyProvider();
    await authService.requestOtp("09121110006", provider);

    await prisma.otpToken.updateMany({
      where: { phone: "+989121110006" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(authService.verifyOtp("09121110006", sentCodes[0]!)).rejects.toThrow(/منقضی/);
  });

  it("replaces a previous unused OTP when a new one is requested for the same phone", async () => {
    const { provider } = spyProvider();
    await authService.requestOtp("09121110007", provider);
    await authService.requestOtp("09121110007", provider);

    const count = await prisma.otpToken.count({ where: { phone: "+989121110007" } });
    expect(count).toBe(1);
  });
});

describe("refreshSession", () => {
  it("rotates the refresh token: old one stops working, new one works", async () => {
    const { provider, sentCodes } = spyProvider();
    await authService.requestOtp("09121110008", provider);
    const first = await authService.verifyOtp("09121110008", sentCodes[0]!);

    const refreshed = await authService.refreshSession(first.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(first.refreshToken);

    // The old refresh token was rotated out — reusing it must fail.
    await expect(authService.refreshSession(first.refreshToken)).rejects.toThrow();

    // The new one still works.
    const refreshedAgain = await authService.refreshSession(refreshed.refreshToken);
    expect(refreshedAgain.accessToken).toBeTruthy();
  });

  it("rejects an unknown refresh token", async () => {
    await expect(authService.refreshSession("not-a-real-token")).rejects.toThrow();
  });

  it("rejects a refresh token belonging to a deactivated user", async () => {
    const { provider, sentCodes } = spyProvider();
    await authService.requestOtp("09121110009", provider);
    const session = await authService.verifyOtp("09121110009", sentCodes[0]!);

    await prisma.user.update({
      where: { phone: "+989121110009" },
      data: { isActive: false },
    });

    await expect(authService.refreshSession(session.refreshToken)).rejects.toThrow();
  });
});

describe("logout", () => {
  it("revokes the refresh token so it can no longer be used to refresh", async () => {
    const { provider, sentCodes } = spyProvider();
    await authService.requestOtp("09121110010", provider);
    const session = await authService.verifyOtp("09121110010", sentCodes[0]!);

    await authService.logout(session.refreshToken);

    await expect(authService.refreshSession(session.refreshToken)).rejects.toThrow();
  });

  it("is a no-op for an already-unknown token (no crash on double logout)", async () => {
    await expect(authService.logout("never-issued-token")).resolves.toBeUndefined();
  });
});

describe("getUserById", () => {
  it("returns the user for a valid id", async () => {
    const created = await prisma.user.create({
      data: { phone: "+989121110011", name: "Lookup Me" },
    });
    const found = await authService.getUserById(created.id);
    expect(found.phone).toBe("+989121110011");
  });

  it("throws for a well-formed but nonexistent id", async () => {
    const fakeId = randomUUID();
    await expect(authService.getUserById(fakeId)).rejects.toThrow();
  });
});
