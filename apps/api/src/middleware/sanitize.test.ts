import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { sanitizeRequest } from "./sanitize.js";

describe("sanitizeRequest", () => {
  it("strips Mongo operator keys from req.body", () => {
    const req = {
      body: { phone: "+989121234567", $where: "this.a == this.b" },
      params: {},
    } as unknown as Request;
    let nextCalled = false;

    sanitizeRequest(req, {} as Response, () => {
      nextCalled = true;
    });

    expect(req.body).toEqual({ phone: "+989121234567" });
    expect(nextCalled).toBe(true);
  });

  it("strips operator keys from nested body objects", () => {
    const req = { body: { filter: { $gt: "" } }, params: {} } as unknown as Request;

    sanitizeRequest(req, {} as Response, () => {});

    expect(req.body).toEqual({ filter: {} });
  });

  it("strips operator keys from req.params", () => {
    const req = { body: {}, params: { id: "abc", $ne: "x" } } as unknown as Request;

    sanitizeRequest(req, {} as Response, () => {});

    expect(req.params).toEqual({ id: "abc" });
  });

  it("does nothing when body/params are absent", () => {
    const req = {} as unknown as Request;
    let nextCalled = false;

    expect(() =>
      sanitizeRequest(req, {} as Response, () => {
        nextCalled = true;
      }),
    ).not.toThrow();
    expect(nextCalled).toBe(true);
  });
});
