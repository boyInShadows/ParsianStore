import { afterEach, describe, expect, it } from "vitest";
import express, { type RequestHandler } from "express";
import type { Server } from "node:http";
import { env } from "../config/env.js";
import { apiRateLimiter, authRateLimiter, otpRequestRateLimiter } from "./rateLimit.js";

async function startProbeServer(limiter: RequestHandler): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const app = express();
  app.use(express.json());
  app.use(limiter);
  app.all("/probe", (_req, res) => res.json({ ok: true }));

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

describe("rate limiters", () => {
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    // Every limiter's skip() reads env.NODE_ENV at request time (not just
    // at construction), so flipping it back here is enough to restore the
    // test-wide bypass for every other test file that shares this process.
    env.NODE_ENV = originalNodeEnv;
  });

  it("is a no-op in the test environment (the default for this whole suite)", async () => {
    const { baseUrl, close } = await startProbeServer(otpRequestRateLimiter);
    try {
      for (let i = 0; i < 8; i += 1) {
        const res = await fetch(`${baseUrl}/probe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: "+989121234567" }),
        });
        expect(res.status).toBe(200);
      }
    } finally {
      await close();
    }
  });

  it("otpRequestRateLimiter blocks the 6th request/hour for the same phone", async () => {
    env.NODE_ENV = "production";
    const { baseUrl, close } = await startProbeServer(otpRequestRateLimiter);
    try {
      for (let i = 0; i < 5; i += 1) {
        const res = await fetch(`${baseUrl}/probe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: "+989121234567" }),
        });
        expect(res.status).toBe(200);
      }
      const blocked = await fetch(`${baseUrl}/probe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "+989121234567" }),
      });
      expect(blocked.status).toBe(429);
      const body = (await blocked.json()) as { ok: boolean; error: { message: string } };
      expect(body.ok).toBe(false);
    } finally {
      await close();
    }
  });

  it("otpRequestRateLimiter tracks a different phone independently", async () => {
    env.NODE_ENV = "production";
    const { baseUrl, close } = await startProbeServer(otpRequestRateLimiter);
    try {
      for (let i = 0; i < 5; i += 1) {
        await fetch(`${baseUrl}/probe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: "+989120000001" }),
        });
      }
      const otherPhone = await fetch(`${baseUrl}/probe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "+989120000002" }),
      });
      expect(otherPhone.status).toBe(200);
    } finally {
      await close();
    }
  });

  it("authRateLimiter blocks the 11th request/15min from the same IP", async () => {
    env.NODE_ENV = "production";
    const { baseUrl, close } = await startProbeServer(authRateLimiter);
    try {
      for (let i = 0; i < 10; i += 1) {
        const res = await fetch(`${baseUrl}/probe`);
        expect(res.status).toBe(200);
      }
      const blocked = await fetch(`${baseUrl}/probe`);
      expect(blocked.status).toBe(429);
    } finally {
      await close();
    }
  });

  it("apiRateLimiter blocks the 101st request/min from the same IP", async () => {
    env.NODE_ENV = "production";
    const { baseUrl, close } = await startProbeServer(apiRateLimiter);
    try {
      const responses: number[] = [];
      for (let i = 0; i < 101; i += 1) {
        const res = await fetch(`${baseUrl}/probe`);
        responses.push(res.status);
      }
      expect(responses.slice(0, 100).every((status) => status === 200)).toBe(true);
      expect(responses[100]).toBe(429);
    } finally {
      await close();
    }
  });
});
