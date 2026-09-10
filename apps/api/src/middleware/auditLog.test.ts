import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "../config/prisma.js";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { seedUser } from "../test/factories.js";
import { signAccessToken } from "../utils/jwt.js";
import { requireAuth } from "./auth.js";
import { auditLog } from "./auditLog.js";
import { errorHandler } from "./error.js";

// A minimal throwaway app rather than the real one: exercises the
// middleware's generic actor/action/entity/ip behavior in isolation. The
// real admin catalog routers (modules/catalog/*.admin.routes.ts, P3.S1+)
// wire this the same way against real entities — see their own route
// tests for that integration.
//
// It therefore listens itself rather than calling `startTestServer()`, which
// boots the *real* app and would answer 404 for every route below.
let baseUrl: string;
let server: Server;
let actorId: string;

beforeAll(async () => {
  await resetDb();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/fake-admin", requireAuth, auditLog("widget"));
  app.get("/fake-admin/:id", (_req, res) => res.json({ ok: true }));
  app.post("/fake-admin", (_req, res) => res.status(201).json({ ok: true }));
  app.patch("/fake-admin/:id", (_req, res) => res.json({ ok: true }));
  app.post("/fake-admin/fails", (_req, res) => res.status(400).json({ ok: false }));
  app.use(errorHandler);

  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

// `actorId` is a foreign key now, so the token has to name a user that
// exists — under Mongo any id at all would store.
beforeEach(async () => {
  await resetDb();
  actorId = (await seedUser({ role: "admin" })).id;
});

afterAll(async () => {
  server.close();
  await disconnectDB();
});

function authHeader(userId: string): Record<string, string> {
  const token = signAccessToken({ sub: userId, role: "admin", accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

// The middleware writes on res.on("finish"), after the response has
// already gone out — a fixed sleep here was flaky under full-suite load
// (passed in isolation, occasionally missed the write when many other
// test files were competing for the event loop). Polling for the actual
// condition is deterministic regardless of load.
async function waitForAuditEntry(timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await prisma.auditLog.count()) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No audit log entry appeared within ${timeoutMs}ms`);
}

describe("auditLog middleware", () => {
  it("does not log a GET request", async () => {
    const res = await fetch(`${baseUrl}/fake-admin/1`, { headers: authHeader(actorId) });
    expect(res.status).toBe(200);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("logs a successful write with actor/action/entity/entityId", async () => {
    const res = await fetch(`${baseUrl}/fake-admin/42`, {
      method: "PATCH",
      headers: { ...authHeader(actorId), "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });
    expect(res.status).toBe(200);
    await waitForAuditEntry();

    const entries = await prisma.auditLog.findMany();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.actorId).toBe(actorId);
    expect(entries[0]!.entity).toBe("widget");
    expect(entries[0]!.entityId).toBe("42");
    expect(entries[0]!.action).toContain("PATCH");
  });

  it("does not log a failed (4xx) write", async () => {
    const res = await fetch(`${baseUrl}/fake-admin/fails`, {
      method: "POST",
      headers: authHeader(actorId),
    });
    expect(res.status).toBe(400);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("rejects an unauthenticated write before it ever reaches the audit step", async () => {
    const res = await fetch(`${baseUrl}/fake-admin`, { method: "POST" });
    expect(res.status).toBe(401);
    expect(await prisma.auditLog.count()).toBe(0);
  });
});
