import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { requireRole, requireStaff, STAFF_ROLES } from "./rbac.js";
import type { ApiError } from "../utils/ApiError.js";

function mockReq(role?: string): Request {
  return (role ? { user: { sub: "user-1", role } } : {}) as unknown as Request;
}

function calledWithError(next: NextFunction): ApiError {
  const mock = next as unknown as { mock: { calls: unknown[][] } };
  return mock.mock.calls[0]![0] as ApiError;
}

describe("requireRole", () => {
  it("calls next() with a 401 ApiError when there is no req.user", () => {
    const next = vi.fn() as NextFunction;
    requireRole("admin")(mockReq(), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = calledWithError(next);
    expect(err.statusCode).toBe(401);
  });

  it("calls next() with a 403 ApiError when the role isn't in the allowed list", () => {
    const next = vi.fn() as NextFunction;
    requireRole("admin", "superadmin")(mockReq("customer"), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = calledWithError(next);
    expect(err.statusCode).toBe(403);
  });

  it("calls next() with no argument when the role is allowed", () => {
    const next = vi.fn() as NextFunction;
    requireRole("admin", "superadmin")(mockReq("admin"), {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe("requireStaff", () => {
  it("STAFF_ROLES excludes customer", () => {
    expect(STAFF_ROLES).not.toContain("customer");
    expect(STAFF_ROLES).toEqual(["support", "operator", "admin", "superadmin"]);
  });

  it("rejects a customer", () => {
    const next = vi.fn() as NextFunction;
    requireStaff()(mockReq("customer"), {} as Response, next);
    const err = calledWithError(next);
    expect(err.statusCode).toBe(403);
  });

  it("allows every staff role", () => {
    for (const role of STAFF_ROLES) {
      const next = vi.fn() as NextFunction;
      requireStaff()(mockReq(role), {} as Response, next);
      expect(next).toHaveBeenCalledWith();
    }
  });
});
