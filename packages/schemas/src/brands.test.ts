import { describe, expect, it } from "vitest";
import { brandsResponseSchema } from "./brands.js";

describe("brandsResponseSchema", () => {
  it("accepts a valid brands payload", () => {
    const result = brandsResponseSchema.safeParse({
      ok: true,
      data: [{ id: "1", name: { fa: "بوش", en: "Bosch" }, slug: "bosch" }],
      meta: { total: 1, page: 1, limit: 100 },
    });
    expect(result.success).toBe(true);
  });
});
