import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import type { Server } from "node:http";
import { app, healthHandler } from "./app.js";

describe("healthHandler", () => {
  it("responds with the Zod-validated health payload", () => {
    const json = vi.fn();
    const res = { json } as unknown as Response;

    healthHandler({} as Request, res);

    expect(json).toHaveBeenCalledWith({ ok: true, data: { status: "up" } });
  });
});

describe("app (integration)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected server to bind to a TCP port");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("serves the health check over real HTTP", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, data: { status: "up" } });
  });

  it("sets helmet's security headers", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-dns-prefetch-control")).toBe("off");
  });

  it("echoes a per-request id as X-Request-Id", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("relaxes Cross-Origin-Resource-Policy to cross-origin for /uploads only, so apps/web (a different origin) can load product images", async () => {
    const uploadRes = await fetch(`${baseUrl}/uploads/does-not-exist/thumb.webp`);
    expect(uploadRes.headers.get("cross-origin-resource-policy")).toBe("cross-origin");

    const apiRes = await fetch(`${baseUrl}/api/v1/health`);
    expect(apiRes.headers.get("cross-origin-resource-policy")).toBe("same-origin");
  });

  it("returns the 404 envelope for an unknown route", async () => {
    const res = await fetch(`${baseUrl}/api/v1/does-not-exist`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: boolean; error: { message: string } };
    expect(body.ok).toBe(false);
    expect(body.error.message).toContain("/api/v1/does-not-exist");
  });
});
