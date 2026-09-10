import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { seedProvinceWithCity } from "../test/factories.js";
import { clampLimit, paginate, parseSort, paginationQuerySchema, toSkip } from "./pagination.js";

describe("paginationQuerySchema", () => {
  it("defaults page to 1 and limit to 20 when absent", () => {
    const result = paginationQuerySchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string query values to numbers", () => {
    const result = paginationQuerySchema.parse({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("rejects a non-positive page or limit", () => {
    expect(() => paginationQuerySchema.parse({ page: "0" })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: "-5" })).toThrow();
  });
});

describe("clampLimit", () => {
  it("passes through a value at or under 100", () => {
    expect(clampLimit(50)).toBe(50);
    expect(clampLimit(100)).toBe(100);
  });

  it("caps a value over 100", () => {
    expect(clampLimit(500)).toBe(100);
  });
});

describe("toSkip", () => {
  it("computes the correct offset", () => {
    expect(toSkip(1, 20)).toBe(0);
    expect(toSkip(2, 20)).toBe(20);
    expect(toSkip(3, 10)).toBe(20);
  });
});

describe("parseSort", () => {
  it("translates the Mongoose-style wire format into orderBy", () => {
    expect(parseSort("-createdAt slug", "Province")).toEqual([
      { createdAt: "desc" },
      { slug: "asc" },
      { id: "asc" },
    ]);
  });

  // A real behaviour difference the migration introduced: Mongoose ignored a
  // sort on a path it did not have, while Prisma throws on an unknown orderBy
  // key -- which would turn `?sort=garbage` from a harmless no-op into a 500.
  it("drops a field the model does not have instead of throwing", () => {
    expect(parseSort("nonsense", "Province")).toEqual([{ id: "asc" }]);
  });

  // Without it, a page boundary inside a run of equal sort values is not
  // deterministic: the same row can appear on two consecutive pages, or on
  // neither.
  it("always appends id as the tiebreaker", () => {
    expect(parseSort(undefined, "Province")).toEqual([{ id: "asc" }]);
  });
});

describe("paginate", () => {
  // A real table rather than a throwaway model: Prisma has no equivalent of
  // registering an ad-hoc schema at runtime, and `parseSort` reads the model
  // name from the generated metadata, so the fixture has to be something the
  // schema actually declares.
  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const { province } = await seedProvinceWithCity();
    await prisma.city.createMany({
      data: Array.from({ length: 24 }, (_unused, index) => ({
        provinceId: province.id,
        nameFa: `شهر ${index + 2}`,
        nameEn: `City ${index + 2}`,
        slug: `city-${String(index + 2).padStart(3, "0")}`,
      })),
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("returns the correct page slice and total count", async () => {
    const result = await paginate(prisma.city, "City", {}, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(10);
    expect(result.meta).toEqual({ total: 25, page: 1, limit: 10 });
  });

  it("returns the remainder on the last page", async () => {
    const result = await paginate(prisma.city, "City", {}, { page: 3, limit: 10 });
    expect(result.data).toHaveLength(5);
  });

  it("clamps an over-limit request instead of erroring", async () => {
    const result = await paginate(prisma.city, "City", {}, { page: 1, limit: 500 });
    expect(result.meta.limit).toBe(100);
  });

  it("applies the given filter", async () => {
    const result = await paginate(
      prisma.city,
      "City",
      { slug: { startsWith: "city-01" } },
      { page: 1, limit: 20 },
    );
    // city-010 through city-019.
    expect(result.meta.total).toBe(10);
  });
});
