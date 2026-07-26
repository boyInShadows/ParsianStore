import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { testDbUri } from "../config/testDbUri.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { signAccessToken } from "../utils/jwt.js";
import { requireAuth } from "./auth.js";
import { auditLog } from "./auditLog.js";
import { errorHandler } from "./error.js";

// A minimal throwaway app rather than the real one: exercises the
// middleware's generic actor/action/entity/ip behavior in isolation. The
// real admin catalog routers (modules/catalog/*.admin.routes.ts, P3.S1+)
// wire this the same way against real entities — see their own route
// tests for that integration.
const TEST_URI = testDbUri("parsian-store-test-audit-middleware");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/fake-admin", requireAuth, auditLog("widget"));
  app.get("/fake-admin/:id", (_req, res) => res.json({ ok: true }));
  app.post("/fake-admin", (_req, res) => res.status(201).json({ ok: true }));
  app.patch("/fake-admin/:id", (_req, res) => res.json({ ok: true }));
  app.post("/fake-admin/fails", (_req, res) => res.status(400).json({ ok: false }));
  app.use(errorHandler);

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
  await AuditLogModel.deleteMany({});
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function authHeader(userId: string): Record<string, string> {
  const token = signAccessToken({ sub: userId, role: "admin" });
  return { cookie: `accessToken=${token}` };
}

// The middleware writes on res.on("finish"), after the response has
// already gone out — a fixed sleep here was flaky under full-suite load
// (passed in isolation, occasionally missed the write when many other
// test files' Mongo connections were competing for the event loop).
// Polling for the actual condition is deterministic regardless of load.
async function waitForAuditEntry(timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await AuditLogModel.countDocuments({})) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`No audit log entry appeared within ${timeoutMs}ms`);
}

describe("auditLog middleware", () => {
  it("does not log a GET request", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/fake-admin/1`, { headers: authHeader(userId) });
    expect(res.status).toBe(200);
    expect(await AuditLogModel.countDocuments({})).toBe(0);
  });

  it("logs a successful write with actor/action/entity/entityId", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/fake-admin/42`, {
      method: "PATCH",
      headers: { ...authHeader(userId), "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });
    expect(res.status).toBe(200);
    await waitForAuditEntry();

    const entries = await AuditLogModel.find({});
    expect(entries).toHaveLength(1);
    expect(entries[0]!.actorId.toString()).toBe(userId);
    expect(entries[0]!.entity).toBe("widget");
    expect(entries[0]!.entityId).toBe("42");
    expect(entries[0]!.action).toContain("PATCH");
  });

  it("does not log a failed (4xx) write", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/fake-admin/fails`, {
      method: "POST",
      headers: authHeader(userId),
    });
    expect(res.status).toBe(400);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await AuditLogModel.countDocuments({})).toBe(0);
  });

  it("rejects an unauthenticated write before it ever reaches the audit step", async () => {
    const res = await fetch(`${baseUrl}/fake-admin`, { method: "POST" });
    expect(res.status).toBe(401);
    expect(await AuditLogModel.countDocuments({})).toBe(0);
  });
});
