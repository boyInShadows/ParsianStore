import { describe, expect, it } from "vitest";
import { brandResponseSchema, brandsResponseSchema } from "./brands.js";

const brand = {
  id: "1",
  name: { fa: "بوش", en: "Bosch" },
  slug: "bosch",
  country: "Germany",
  isOEM: true,
};

describe("brandsResponseSchema", () => {
  it("accepts a valid brands payload", () => {
    const result = brandsResponseSchema.safeParse({
      ok: true,
      data: [brand],
      meta: { total: 1, page: 1, limit: 100 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a brand detail payload with its trust fields", () => {
    const result = brandResponseSchema.safeParse({ ok: true, data: brand });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.data.seo).toEqual({});
  });
});
