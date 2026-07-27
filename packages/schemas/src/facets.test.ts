import { describe, expect, it } from "vitest";
import { facetsResponseSchema } from "./facets.js";

const validBucket = { id: "1", name: { fa: "ترمز", en: "Brakes" }, slug: "brakes", count: 12 };

describe("facetsResponseSchema", () => {
  it("accepts a valid facets payload", () => {
    const result = facetsResponseSchema.safeParse({
      ok: true,
      data: {
        categories: [validBucket],
        brands: [validBucket],
        stock: [{ inStock: true, count: 12 }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a bucket missing a required field", () => {
    const result = facetsResponseSchema.safeParse({
      ok: true,
      data: {
        categories: [{ id: "1", slug: "brakes", count: 12 }],
        brands: [],
        stock: [],
      },
    });
    expect(result.success).toBe(false);
  });
});
