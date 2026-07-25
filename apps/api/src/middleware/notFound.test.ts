import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { notFoundHandler } from "./notFound.js";

describe("notFoundHandler", () => {
  it("responds 404 with the standard error envelope, naming the missing route", () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const req = { method: "GET", originalUrl: "/api/v1/does-not-exist" } as Request;
    const res = { status } as unknown as Response;

    notFoundHandler(req, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      ok: false,
      error: { message: "Route not found: GET /api/v1/does-not-exist" },
    });
  });
});
