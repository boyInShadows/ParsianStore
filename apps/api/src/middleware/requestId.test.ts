import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { requestId } from "./requestId.js";

function mockRes(): { res: Response; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  } as unknown as Response;
  return { res, headers };
}

describe("requestId", () => {
  it("assigns req.id and echoes it as X-Request-Id", () => {
    const req = {} as Request;
    const { res, headers } = mockRes();
    let nextCalled = false;

    requestId(req, res, () => {
      nextCalled = true;
    });

    expect(typeof req.id).toBe("string");
    expect((req.id as string).length).toBeGreaterThan(0);
    expect(headers["X-Request-Id"]).toBe(req.id);
    expect(nextCalled).toBe(true);
  });

  it("assigns a different id on each call", () => {
    const req1 = {} as Request;
    const req2 = {} as Request;
    const { res } = mockRes();

    requestId(req1, res, () => {});
    requestId(req2, res, () => {});

    expect(req1.id).not.toBe(req2.id);
  });
});
