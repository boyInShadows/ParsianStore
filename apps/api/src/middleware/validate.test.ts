import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { validate, validateParams, validateQuery } from "./validate.js";

describe("validate", () => {
  const schema = z.object({ phone: z.string().min(1) });

  it("replaces req.body with the parsed result and calls next", () => {
    const req = { body: { phone: "09121234567" } } as unknown as Request;
    const next = vi.fn();

    validate(schema)(req, {} as Response, next);

    expect(req.body).toEqual({ phone: "09121234567" });
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with a ZodError on an invalid body", () => {
    const req = { body: {} } as unknown as Request;
    const next = vi.fn();

    validate(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(z.ZodError);
  });
});

describe("validateQuery", () => {
  const schema = z.object({ page: z.coerce.number().default(1) });

  it("stores the parsed result on req.validatedQuery, leaving req.query untouched", () => {
    const req = { query: { page: "3" } } as unknown as Request;
    const next = vi.fn();

    validateQuery(schema)(req, {} as Response, next);

    expect(req.validatedQuery).toEqual({ page: 3 });
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with a ZodError on an invalid query", () => {
    const req = { query: { page: "not-a-number" } } as unknown as Request;
    const next = vi.fn();

    validateQuery(schema)(req, {} as Response, next);

    expect(next.mock.calls[0]![0]).toBeInstanceOf(z.ZodError);
  });
});

describe("validateParams", () => {
  const schema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) });

  it("replaces req.params with the parsed result", () => {
    const id = "507f1f77bcf86cd799439011";
    const req = { params: { id } } as unknown as Request;
    const next = vi.fn();

    validateParams(schema)(req, {} as Response, next);

    expect(req.params).toEqual({ id });
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with a ZodError on a malformed param", () => {
    const req = { params: { id: "not-an-object-id" } } as unknown as Request;
    const next = vi.fn();

    validateParams(schema)(req, {} as Response, next);

    expect(next.mock.calls[0]![0]).toBeInstanceOf(z.ZodError);
  });
});
