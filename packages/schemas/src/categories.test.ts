import { describe, expect, it } from "vitest";
import { categoriesResponseSchema, categoryResponseSchema } from "./categories.js";

describe("categoryResponseSchema", () => {
  it("accepts a valid category payload", () => {
    const result = categoryResponseSchema.safeParse({
      ok: true,
      data: {
        id: "1",
        name: { fa: "ترمز", en: "Brakes" },
        slug: "brakes",
        parentId: null,
        path: [],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a category missing a required field", () => {
    const result = categoryResponseSchema.safeParse({
      ok: true,
      data: { id: "1", slug: "brakes", parentId: null, path: [] },
    });
    expect(result.success).toBe(false);
  });
});

describe("categoriesResponseSchema", () => {
  it("accepts a valid category list payload", () => {
    const result = categoriesResponseSchema.safeParse({
      ok: true,
      data: [
        {
          id: "1",
          name: { fa: "ترمز", en: "Brakes" },
          slug: "brakes",
          parentId: null,
          path: [],
        },
      ],
      meta: { total: 1, page: 1, limit: 20 },
    });
    expect(result.success).toBe(true);
  });
});
