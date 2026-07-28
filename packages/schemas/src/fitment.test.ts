import { describe, expect, it } from "vitest";
import { fitmentCheckResponseSchema } from "./fitment.js";

describe("fitmentCheckResponseSchema", () => {
  it("accepts a real confidence verdict", () => {
    const result = fitmentCheckResponseSchema.safeParse({
      ok: true,
      data: { confidence: "exact" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null confidence (no fitment record)", () => {
    const result = fitmentCheckResponseSchema.safeParse({
      ok: true,
      data: { confidence: null },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown confidence value", () => {
    const result = fitmentCheckResponseSchema.safeParse({
      ok: true,
      data: { confidence: "maybe" },
    });
    expect(result.success).toBe(false);
  });
});
