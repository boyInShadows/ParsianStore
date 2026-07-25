import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { ZodError, z } from "zod";
import { ApiError } from "../utils/ApiError.js";

vi.mock("../config/logger.js", () => ({
  logger: { error: vi.fn() },
}));

const { errorHandler } = await import("./error.js");
const { logger } = await import("../config/logger.js");

function mockRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json } as unknown as Response & { status: typeof status; json: typeof json };
}

describe("errorHandler", () => {
  it("uses ApiError's own status code and message", () => {
    const res = mockRes();
    const err = new ApiError(404, "Product not found");

    errorHandler(err, {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: { message: "Product not found" } });
  });

  it("maps a ZodError to 400 with validation issues", () => {
    const res = mockRes();
    const result = z.object({ name: z.string() }).safeParse({});
    const err = result.error as ZodError;

    errorHandler(err, {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: { message: "Invalid request", issues: err.issues },
    });
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
