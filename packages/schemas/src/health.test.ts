import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health.js";

describe("healthResponseSchema", () => {
  it("accepts a valid health payload", () => {
    const result = healthResponseSchema.safeParse({ ok: true, data: { status: "up" } });
    expect(result.success).toBe(true);
  });

  it("rejects a payload with the wrong status", () => {
    const result = healthResponseSchema.safeParse({ ok: true, data: { status: "down" } });
    expect(result.success).toBe(false);
  });
});
