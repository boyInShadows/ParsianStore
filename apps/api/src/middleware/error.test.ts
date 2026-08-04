import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { ZodError, z } from "zod";
import { ApiError } from "../utils/ApiError.js";

vi.mock("../config/logger.js", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

const { errorHandler } = await import("./error.js");
const { logger } = await import("../config/logger.js");

function mockRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json } as unknown as Response & { status: typeof status; json: typeof json };
}

describe("errorHandler", () => {
  beforeEach(() => {
    vi.mocked(logger.warn).mockClear();
    vi.mocked(logger.error).mockClear();
  });

  it("uses ApiError's own status code and message", () => {
    const res = mockRes();
    const err = new ApiError(404, "Product not found");

    errorHandler(err, { originalUrl: "/api/v1/catalog/products/nope" } as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: { message: "Product not found" } });
  });

  // A 4xx would otherwise reach the terminal as a bare status code from
  // pino-http, with no way to tell which of a route's many ApiError throws
  // fired -- these two cases are why error.ts logs at all.
  it("logs a 4xx ApiError at warn with its path and message", () => {
    const res = mockRes();
    const err = new ApiError(404, "Product not found");

    errorHandler(err, { originalUrl: "/api/v1/catalog/products/nope" } as Request, res, vi.fn());

    expect(logger.warn).toHaveBeenCalledWith(
      { statusCode: 404, path: "/api/v1/catalog/products/nope" },
      "ApiError: Product not found",
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs a 5xx ApiError at error, not warn", () => {
    const res = mockRes();
    const err = new ApiError(503, "Payment gateway unavailable");

    errorHandler(err, { originalUrl: "/api/v1/checkout" } as Request, res, vi.fn());

    expect(logger.error).toHaveBeenCalledWith(
      { statusCode: 503, path: "/api/v1/checkout" },
      "ApiError: Payment gateway unavailable",
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("maps a ZodError to 400 with validation issues and logs them", () => {
    const res = mockRes();
    const result = z.object({ name: z.string() }).safeParse({});
    const err = result.error as ZodError;

    errorHandler(err, { originalUrl: "/api/v1/admin/catalog/products" } as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: { message: "Invalid request", issues: err.issues },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      { path: "/api/v1/admin/catalog/products", issues: err.issues },
      "Invalid request",
    );
  });

  it("maps a Mongo duplicate-key error to 400 and logs the conflicting field", () => {
    const res = mockRes();
    const err = { code: 11000, keyValue: { slug: "brake-pad" } };

    errorHandler(err, { originalUrl: "/api/v1/admin/catalog/brands" } as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: { message: "این مقدار برای «slug» قبلاً استفاده شده است" },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      { path: "/api/v1/admin/catalog/brands", field: "slug" },
      "Duplicate key",
    );
  });

  it("hides unknown error details behind a generic 500 and logs the real error", () => {
    const res = mockRes();
    const err = new Error("Mongo connection string is malformed");

    errorHandler(err, { originalUrl: "/api/v1/health" } as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: { message: "Internal server error" },
    });
    expect(logger.error).toHaveBeenCalledWith({ err, path: "/api/v1/health" }, "Unhandled error");
  });
});
