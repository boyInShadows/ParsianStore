import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { healthHandler } from "./app.js";

describe("healthHandler", () => {
  it("responds with the Zod-validated health payload", () => {
    const json = vi.fn();
    const res = { json } as unknown as Response;

    healthHandler({} as Request, res);

    expect(json).toHaveBeenCalledWith({ ok: true, data: { status: "up" } });
  });
});
